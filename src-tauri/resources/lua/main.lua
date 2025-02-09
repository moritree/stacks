local Entity = require('Entity')

return {
    scene = require('Scene'):new({
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
    })
}
