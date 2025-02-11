local Entity = require('Entity')

return {
    scene = require('Scene'):new({
        entities = {
            test1 = Entity:new({
                type = "text",
                pos = { x = 100, y = 100 },
                content = "vibing",
                on_click = function(self) self.pos = { x = 200, y = 200 } end
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
            }),
            top_left = Entity:new({
                type = "rect",
                pos = { x = 0, y = 0 },
                dimension = { x = 10, y = 10 },
                color = "#00ff00"
            }),
            bottom_right = Entity:new({
                type = "rect",
                pos = { x = 1270, y = 710 },
                dimension = { x = 10, y = 10 },
                color = "#0000ff"
            })
        }
    })
}
