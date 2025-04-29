local deep_copy = require('deep_copy')
local serializer = require('serpent')
local Entity = require('Entity')

local Scene = {
    entities = {}
}

function Scene:new(o)
    o = o or {}
    setmetatable(o, self)
    self.__index = self
    return o
end

function Scene:emit_update(dt)
    for _, entity in pairs(self.entities) do if entity.scripts.on_tick then entity:run_script("on_tick") end end

    local entities_copy = deep_copy(self.entities)
    for _, entity in pairs(entities_copy) do
        for script, _ in pairs(entity.scripts) do
            entity.scripts[script] = entity.scripts[script].string
        end
    end
    emit("scene_update", entities_copy)
end

function Scene:update_entity_id(original_id, new_id, data)
    if self.entities[original_id] == nil then
        error(string.format("Cannot update ID, %s is not an existing ID", original_id))
    end

    if (new_id ~= original_id) then
        self.entities[new_id] = self.entities[original_id]
        self.entities[original_id] = nil
    end
    if (data) then self.entities[new_id]:update(data) end
end

function Scene:duplicate_entity(id)
    if not self.entities[id] then
        error(string.format("Can't duplicate %s, no entity with this id exists.", id))
    end

    local new_key = id .. "_clone"
    while self.entities[new_key] do new_key = new_key .. "_clone" end

    self.entities[new_key] = deep_copy(self.entities[id])
    self.entities[new_key].pos.x = self.entities[new_key].pos.x + 15
    self.entities[new_key].pos.y = self.entities[new_key].pos.y + 15
end

function Scene:save_scene(path)
    local to_save = {}
    for id, entity in pairs(self.entities) do to_save[id] = entity:serializable() end

    local file = assert(io.open(path, "w"), "Couldn't open file")
    file:write(serializer.dump(to_save))
    file:close()
end

function Scene:load_scene(path)
    local file = assert(io.open(path, "r"), string.format("Couldn't open file at \"%s\".", path))
    local content = file:read("*all")
    file:close()

    local success, loaded_entities = serializer.load(content)
    if not success then error "Couldn't deserialize scene." end

    local new_entities = {}
    for k, v in pairs(loaded_entities --[[@as table]]) do new_entities[k] = Entity:new(v) end
    self.entities = new_entities
end

function Scene:entity_as_block_string(id)
    local copy = self.entities[id]:serializable()
    copy.id = id
    copy.scripts = nil
    local block = serializer.block(copy, { comment = false })

    -- strip brackets & unindent
    block = block:sub(5, #block - 2)
    local i = 1
    while i < #block do
        if block:sub(i, i) == "\n" and block:sub(i + 1, i + 2) == "  " then
            block = block:sub(1, i) .. block:sub(i + 3, #block)
        end
        i = i + 1
    end
    return block
end

-- Invoke script on any listening entity
function Scene:handle_broadcast(event, data)
    local failed = {}
    for id, entity in pairs(self.entities) do
        for script, _ in pairs(entity.scripts) do
            if script == event then
                local success, result = pcall(entity.run_script, entity, script, data)
                if not success then table.insert(failed, { entity = id, error = result }) end
            end
        end
    end

    local fails = #failed
    if fails == 0 then return end
    if fails == 1 then
        error(string.format("Script on \"%s\" failed: %s", failed[1].entity, tostring(failed[1].error)))
    else
        local err_total = string.format("%i scripts failed.", fails)
        for _, fail in ipairs(failed) do
            err_total = err_total .. string.format("\n%s: %s", fail.entity, fail.error)
        end
        error(err_total)
    end
end

-- Invoke script on specific entity
function Scene:handle_message(target, event, data)
    assert(self.entities[target],
        string.format("Couldn't invoke message \"%s\" because the target \"%s\" wasn't found.", event, target))
    assert(self.entities[target].scripts[event],
        string.format("Couldn't invoke message \"%s\" because no matching script on \"%s\" was found.",
            event, target))

    local success, result = pcall(self.entities[target].run_script, self.entities[target], event, data)
    assert(success, string.format("Couldn't invoke message \"%s\" on \"%s\": %s", event, target, tostring(result)))
end

return Scene
