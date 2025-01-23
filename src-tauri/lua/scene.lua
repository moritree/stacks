-- most basic possible scene
local scene = {
    entities = {
        test = {
            type = "text",
            pos = { x = 100, y = 100 },
            content = "vibing"
        }
    }
}

function scene.update(dt)
    emit("scene_update", scene.entities)
end

return scene
