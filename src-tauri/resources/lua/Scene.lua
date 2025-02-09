local Scene = {
    entities = {}
}

function Scene:new(o)
    o = o or {}
    setmetatable(o, self)
    self.__index = self
    return o
end

function Scene:update(dt)
    emit("scene_update", self.entities)
end

function Scene:update_entity_property(id, key, data)
    if self.entities[id] == nil then
        print(string.format("Error: %s is not a valid entity ID", id))
        return
    elseif self.entities[id][key] == nil then
        print(string.format("Warning: %s is not an existing property on entity %s. Updating anyway lol", key, id))
    end
    self.entities[id][key] = data
    self:update(0) -- temp
end

function Scene:delete_entity(id)
    print("delete_entity")
    if self.entities[id] ~= nil then
        self.entities[id] = nil
    else
        print(string.format("Warning: Can't delete entity %s, this id does not exist on the scene", id))
    end
end

function Scene:save_scene(path)
    print(string.format("save_scene to %s", path))
    local file = assert(io.open(path, "w"), "Couldn't open file")
    file:write(require("serpent").dump(self.entities))
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

    local success, loaded_entities = require("serpent").load(content)
    if success then
        self.entities = loaded_entities
        self:update(0) -- temp
    else
        print("Error loading scene: " .. tostring(loaded_entities))
    end
end

return Scene
