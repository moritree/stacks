require('Entity')

-- Most basic possible scene
local scene = {
    entities = {
        test = {
            type = "text",
            pos = { x = 100, y = 100 },
            content = "vibing"
        },
        test2 = {
            type = "text",
            pos = { x = 200, y = 100 },
            content = "u can do it"
        },
        test3 = {
            type = "rect",
            pos = { x = 100, y = 200 },
            dimension = { x = 200, y = 100 },
            color = { r = 255, g = 0, b = 0 }
        }
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
end

return scene
