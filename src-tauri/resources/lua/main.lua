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
                size = { width = 200, height = 100 },
                color = "#ff0000"
            }),
            top_left = Entity:new({
                type = "rect",
                pos = { x = 0, y = 0 },
                size = { width = 10, height = 10 },
                color = "#00ff00"
            }),
            center = Entity:new({
                type = "rect",
                pos = { x = 635, y = 355 },
                size = { width = 10, height = 10 },
                color = "#00ffff"
            }),
            bottom_right = Entity:new({
                type = "rect",
                pos = { x = 1270, y = 710 },
                size = { width = 10, height = 10 },
                color = "#0000ff"
            })
        }
    })
}
