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
    local entities_copy = deep_copy(self.entities)
    -- can't serialize functions! so just set them to "true" to let the frontend know there is a script
    for _, entity in pairs(entities_copy) do
        for property, value in pairs(entity.scripts) do
            if type(value) == "function" then
                entity.scripts[property] = true
            end
        end
    end
    emit("scene_update", entities_copy)
end

function Scene:update_entity_id(original_id, new_id)
    if self.entities[original_id] == nil then
        print(string.format("Error: Cannot update entity ID, %s is not an existing entity ID", original_id))
        return
    end

    self.entities[new_id] = self.entities[original_id]
    self.entities[original_id] = nil
end

function Scene:update_entity_properties(id, data)
    if self.entities[id] == nil then
        print(string.format("Error: Cannot update entity properties, %s is not an existing entity ID", id))
        return
    end
    for k, v in pairs(data) do self.entities[id][k] = v end

    self:emit_update(0)
end

function Scene:replace_entity(id, data)
    if self.entities[id] == nil then
        print(string.format("Error: Cannot overwrite entity, %s is not an existing entity ID", id))
        return
    end
    data.scripts = self.entities[id].scripts
    self.entities[id] = data

    self:emit_update(0)
end

function Scene:delete_entity(id)
    if self.entities[id] ~= nil then
        self.entities[id] = nil
    else
        print(string.format("Warning: Can't delete entity %s, this id does not exist on the scene", id))
    end
end

function Scene:duplicate_entity(id)
    if self.entities[id] ~= nil then
        local new_key = id .. "_clone"
        self.entities[new_key] = deep_copy(self.entities[id])
        self.entities[new_key].pos.x = self.entities[new_key].pos.x + 15
        self.entities[new_key].pos.y = self.entities[new_key].pos.y + 15
    else
        print(string.format("Warning: Can't duplicate entity %s, this id does not exist on the scene", id))
    end
end

function Scene:save_scene(path)
    print(string.format("save_scene to %s", path))
    local file = assert(io.open(path, "w"), "Couldn't open file")
    file:write(serializer.dump(self.entities))
    file:close()
end

function Scene:load_scene(path)
    print("load_scene")
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
        self.entities = loaded_entities
        self:emit_update(0)
    else
        print("Error loading scene: " .. tostring(loaded_entities))
    end
end

return Scene
