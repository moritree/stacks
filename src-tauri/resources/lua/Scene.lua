local deep_copy = require('deep_copy')
local serializer = require('serpent')

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
        print(string.format("Error: Cannot update entity ID, %s is not an existing entity ID", original_id))
        return
    end

    if (new_id ~= original_id) then
        self.entities[new_id] = self.entities[original_id]
        self.entities[original_id] = nil
    end
    if (data) then self.entities[new_id]:update(data) end
end

function Scene:duplicate_entity(id)
    if not self.entities[id] then
        print(string.format(
            "Warning: Can't duplicate entity %s, this id does not exist on the scene", id))
        return
    end

    local new_key = id .. "_clone"
    while self.entities[new_key] do
        new_key = new_key .. "_clone"
    end

    self.entities[new_key] = deep_copy(self.entities[id])
    self.entities[new_key].pos.x = self.entities[new_key].pos.x + 15
    self.entities[new_key].pos.y = self.entities[new_key].pos.y + 15
end

function Scene:save_scene(path)
    local file = assert(io.open(path, "w"), "Couldn't open file")
    file:write(serializer.dump(self.entities))
    file:close()
end

function Scene:load_scene(path)
    local file = io.open(path, "r")
    if not file then
        print("Error loading scene: couldn't open test.txt")
        return
    end

    local content = file:read("*all")
    file:close()

    -- safe mode off to load functions
    -- TODO how do I handle security?
    local success, loaded_entities = serializer.load(content, { safe = false })
    if success then
        local new_entities = {}
        for k, v in pairs(loaded_entities --[[@as table]]) do
            new_entities[k] = require("Entity"):new(v)
        end

        self.entities = new_entities
    else
        print("Error loading scene: " .. tostring(loaded_entities))
    end
end

return Scene
