import { ThementPhysics } from "./elements/physics";

export class ThementRendering {
    scenaObjects: Array<ThementPhysics>;

    container: HTMLCanvasElement
    containerContext: CanvasRenderingContext2D;
    draggable: { is: Boolean, node: ThementPhysics, offset: { x: number, y: number } } | null;
    connector: { is: Boolean, offset: { x: number, y: number }, mouse: { x: number, y: number } } | null;;

    constructor(context: HTMLCanvasElement) {
        this.container = context;
        this.containerContext = context.getContext('2d') as CanvasRenderingContext2D;

        this.scenaObjects = new Array<ThementPhysics>()

        for (let i = 0; i < 100; i++) {
            const object = new ThementPhysics();
            this.scenaObjects.push(object)
        }

        this.init();
    }

    private init() {
        this.container.addEventListener('mousedown', this.mousedown.bind(this));
        this.container.addEventListener('mousemove', this.mousemove.bind(this));
        this.container.addEventListener('mouseup', this.mouseup.bind(this));
        this.container.addEventListener('mouseout', this.mouseout.bind(this));

        requestAnimationFrame(this.loop.bind(this));
    }


    /**
     * @description Метод для поиска элементов в canvas относительно координатов
     * @param param0 
     */
    private raycast({ x, y }) {
        for (const nodeID in this.scenaObjects) {
            const node = this.scenaObjects[nodeID]

            if (y > node.top
                && y < node.top + node.height + (((node.returned.length > node.entered.length ? node.returned.length : node.entered.length) * 22) + 20)
                && x > node.left
                && x < node.left + node.width) {

                for (const i in node.entered) {
                    if (Math.sqrt((x - (node.left + 20)) ** 2 + (y - (node.top + ((22 * Number(i)) + 40))) ** 2) < 8) {
                        return { ...node.entered[i], __id: i };
                    }
                }

                for (const i in node.returned) {
                    if (Math.sqrt((x - (node.left + 180)) ** 2 + (y - (node.top + ((22 * Number(i)) + 40))) ** 2) < 8) {
                        return { ...node.returned[i], __id: i };
                    }
                }

                return node;
            }
        }
    }

    private getMouseRelativePosition(event: MouseEvent): { x: number, y: number } {
        const point = {
            x: event.pageX - this.container.offsetLeft,
            y: event.pageY - this.container.offsetTop
        }

        return point;
    }

    private loop(timestamp: number) {
        this.baseRendering();

        requestAnimationFrame(this.loop.bind(this));
    }

    private mousedown(event: MouseEvent) {
        const point = this.getMouseRelativePosition(event)
        const node = this.raycast({ x: point.x, y: point.y });

        if (node) {
            switch (node.type) {
                case 'node': {
                    this.draggable = { is: true, node: node, offset: { x: point.x - node.left, y: point.y - node.top } }
                } break;

                case 'dot': {
                    this.connector = {
                        is: true,
                        offset: { ...point },
                        mouse: point
                    }

                    console.log(node);

                } break;
            }
        }
    }

    private mouseup(event) {
        this.draggable = null;
        this.connector = null;

        const point = this.getMouseRelativePosition(event)
        const node = this.raycast({ x: point.x, y: point.y });

        if (node)
            console.log(node)
    }

    private mousemove(event: MouseEvent) {
        const point = this.getMouseRelativePosition(event)

        if (this.draggable) {
            if (this.draggable.is) {
                const node = this.draggable.node;

                node.left = point.x - this.draggable.offset.x;
                node.top = point.y - this.draggable.offset.y;
            }
        } else if (this.connector) {
            if (this.connector.is) {
                this.connector.mouse = point;
            }
        }
    }

    private mouseout() {
        this.draggable = null;
    }


    /**
     * @description Вспомогательная функция редеринга rect с возможностью border-raidus
     * @param sx 
     * @param sy 
     * @param ex 
     * @param ey 
     * @param r 
     */
    private rectRadius(sx, sy, ex, ey, r) {
        var r2d = Math.PI / 180;
        if ((ex - sx) - (2 * r) < 0) { r = ((ex - sx) / 2); }
        if ((ey - sy) - (2 * r) < 0) { r = ((ey - sy) / 2); }
        this.containerContext.beginPath();
        this.containerContext.moveTo(sx + r, sy);
        this.containerContext.lineTo(ex - r, sy);
        this.containerContext.arc(ex - r, sy + r, r, r2d * 270, r2d * 360, false);
        this.containerContext.lineTo(ex, ey - r);
        this.containerContext.arc(ex - r, ey - r, r, r2d * 0, r2d * 90, false);
        this.containerContext.lineTo(sx + r, ey);
        this.containerContext.arc(sx + r, ey - r, r, r2d * 90, r2d * 180, false);
        this.containerContext.lineTo(sx, sy + r);
        this.containerContext.arc(sx + r, sy + r, r, r2d * 180, r2d * 270, false);
        this.containerContext.closePath()
    }

    /**
     * Основной рендеринг компонентов
     * 
     * Черновой вариант
     */

    baseRendering() {
        this.containerContext.clearRect(0, 0,
            this.container.width,
            this.container.height
        )

        const context = this.containerContext

        for (const nodeID in this.scenaObjects) {
            const node = this.scenaObjects[nodeID];


            this.rectRadius(node.left, node.top,
                node.width + node.left,
                (node.height + node.top) + (4 * 16.5), 5)
            context.fillStyle = '#4D4861'
            context.strokeStyle = '#4D4861'
            context.stroke()
            context.fill()


            for (let i = 0; i < node.returned.length; i++) {
                const returnObject = node.returned[i];

                context.beginPath()
                context.font = "14.5px serif";
                const name = returnObject.name;
                context.fillStyle = "white"
                context.fillText(name, (node.left + 160) - (name.length * 6), ((42.5 + node.top) + (i * 22)));

                this.containerContext.beginPath();
                this.containerContext.fillStyle = '#EDCB96'
                this.containerContext.arc(node.left + 186, (40 + node.top) + (22 * i), 4, 0, 2 * Math.PI, true);
                this.containerContext.fill();
                this.containerContext.beginPath();

                this.containerContext.strokeStyle = "#EDCB96"
                context.lineWidth = 2;
                this.containerContext.fillStyle = '#4D4861'
                this.containerContext.arc(node.left + 180, (40 + node.top) + (22 * i), 6, 0, 2 * Math.PI, true);
                this.containerContext.fill();
                context.stroke()
            }


            for (let i = 0; i < node.entered.length; i++) {
                const enterObject = node.entered[i];

                context.beginPath()
                context.font = "14.5px serif";
                const name = enterObject.name;
                context.fillStyle = "white"
                context.fillText(name, (node.left + 35), ((42.5 + node.top) + (i * 22)));

                this.containerContext.beginPath();
                this.containerContext.fillStyle = '#EDCB96'
                this.containerContext.arc(node.left + 14, (40 + node.top) + (22 * i), 4, 0, 2 * Math.PI, true);
                this.containerContext.fill();
                this.containerContext.beginPath();

                this.containerContext.strokeStyle = "#EDCB96"
                context.lineWidth = 2;
                this.containerContext.fillStyle = '#4D4861'
                this.containerContext.arc(node.left + 20, (40 + node.top) + (22 * i), 6, 0, 2 * Math.PI, true);
                this.containerContext.fill();
                context.stroke()
            }

            if (this.connector) {
                if (this.connector.is) {
                    context.beginPath(); 
                    context.moveTo(this.connector.offset.x, this.connector.offset.y);  
                    context.lineTo(this.connector.mouse.x, this.connector.mouse.y);
                    context.stroke();    
                }
            }
        }
    }


    public add(node: ThementPhysics) {

    }
}