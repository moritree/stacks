local Entity = require('Entity')

-- Most basic possible scene
local scene = {
    entities = {
        test1 = Entity:new({
            type = "text",
            pos = { x = 100, y = 100 },
            content = "vibing"
        }),
        test2 = Entity:new({
            type = "text",
            pos = { x = 200, y = 100 },
            content = "u can do it",
            selectable = true,
            draggable = true
        }),
        test3 = Entity:new({
            type = "rect",
            pos = { x = 100, y = 200 },
            dimension = { x = 200, y = 100 },
            color = "#ff0000"
        })
    }
}

function scene.update(dt)
    emit("scene_update", scene.entities)
end

function scene.update_entity_property(id, key, data)
    if scene.entities[id] == nil then
        print(string.format("Error: %s is not a valid entity ID", id))
        return
    elseif scene.entities[id][key] == nil then
        print(string.format("Warning: %s is not an existing property on entity %s. Updating anyway lol", key, id))
    end
    scene.entities[id][key] = data
    scene.update(0) -- temp
end

function scene.delete_entity(id)
    print("delete_entity")
    if scene.entities[id] ~= nil then
        scene.entities[id] = nil
    else
        print(string.format("Warning: Can't delete entity %s, this id does not exist on the scene", id))
    end
end

function scene.save_scene(path)
    print(string.format("save_scene to %s", path))
    local file = assert(io.open(path, "w"), "Couldn't open file")
    file:write(require("serpent").dump(scene.entities))
    file:close()
end

function scene.load_scene(path)
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
        scene.entities = loaded_entities
        scene.update(0) -- temp
    else
        print("Error loading scene: " .. tostring(loaded_entities))
    end
end

return scene
