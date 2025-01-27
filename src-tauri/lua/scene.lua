-- most basic possible scene
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

function scene.move_entity_randomly(id)
    if not scene.entities[id] then
        print(string.format("Warning: %s is not an entity within this scene", id))
        return
    end
    scene.entities[id].pos = { x = math.random(window_width), y = math.random(window_height) }
end

function scene.move_entity(id, x, y)
    if not scene.entities[id] then
        print(string.format("Warning: %s is not an entity within this scene", id))
        return
    end
    scene.entities[id].pos = { x = x, y = y }
end

return scene
