import { getDistanceBetweenTwoPoints, getRandomNumBetween } from "../utils/math"
import { LogicalCanvas, Point } from "./canvas"

class ExplosionParticle {
    size: number

    // 初速度
    v0x: number
    v0y: number

    // 起始位置
    x0: number
    y0: number

    // 当前位置
    x: number | null = null
    y: number | null = null

    // 存在时间
    duration: number

    static g = 200

    constructor(size: number, v0x: number, v0y: number, x0: number, y0: number, duration: number) {
        this.size = size
        this.v0x = v0x
        this.v0y = v0y
        this.x0 = x0
        this.y0 = y0
        this.duration = duration
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this.x === null || this.y === null) {
            console.error('x或y为null')
            return
        }
        ctx.beginPath()
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size)
    }
}

class ExplosionParticleGroup {
    ctx: CanvasRenderingContext2D
    particles: ExplosionParticle[]

    // 出现时间
    startTime = 0

    constructor(ctx: CanvasRenderingContext2D, quantity: number, target: Point) {
        this.ctx = ctx
        this.particles = this.createParticles(quantity, target)
    }

    createParticles(quantity: number, target: Point) {
        const {
            x, y
        } = target
        const arr = []
        for (let i = 0; i < quantity; i++) {
            // 随机初速度、存在时间
            const particle = new ExplosionParticle(
                getRandomNumBetween(1, 8),
                // v0x
                getRandomNumBetween(-250, 250),
                // v0y < 0，表明粒子一开始运动的方向是朝上
                getRandomNumBetween(-250, 0),
                x,
                y,
                getRandomNumBetween(500, 3000)
            )
            arr.push(particle)
        }
        return arr
    }

    calculatePosition(elapsed: number) {
        const elapsedS = elapsed / 1000
        this.particles.forEach(p => {

            if (elapsed > p.duration) {
                this.particles = this.particles.filter(_p => _p !== p)
                return
            }

            p.x = p.x0 + p.v0x * elapsedS,
                p.y = p.y0 + p.v0y * elapsedS + 1 / 2 * ExplosionParticle.g * elapsedS * elapsedS
        })
    }

    draw() {
        this.particles.forEach(p => p.draw(this.ctx))
    }
}

export class ExplosionParticleEffect {
    ctx: CanvasRenderingContext2D
    groups: ExplosionParticleGroup[] = []
    hasStarted: boolean = false
    renderCanvasFunction: () => void

    constructor(ctx: CanvasRenderingContext2D, renderCanvasFunction: () => void) {
        this.ctx = ctx
        this.renderCanvasFunction = renderCanvasFunction
    }

    addGroup(target: Point) {
        console.log('target', target)
        this.groups.push(new ExplosionParticleGroup(this.ctx, getRandomNumBetween(3, 15), target))
    }

    anim(timestamp: number) {
        if (this.groups.length === 0) {
            this.hasStarted = false
            this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
            this.renderCanvasFunction()
            return
        }

        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)

        this.groups.forEach(group => {
            if (!group.startTime) group.startTime = timestamp

            const elapsed = timestamp - group.startTime
            group.calculatePosition(elapsed)
            // 某个group的所有粒子消失后，从groups中移除该group
            if (group.particles.length === 0) {
                this.groups = this.groups.filter(_group => _group !== group)
            }
            else {
                group.draw()
            }
        })

        this.renderCanvasFunction()

        requestAnimationFrame(this.anim.bind(this))
    }

    start() {
        if (this.hasStarted) return
        this.hasStarted = true
        requestAnimationFrame(this.anim.bind(this))
    }
}




interface SpaceParticleOptions {
    ctx: CanvasRenderingContext2D
    boundaryX: number
    boundaryY: number
}

class SpaceParticle {
    size: number
    color: string

    boundaryX: number
    boundaryY: number

    startPoint: Point

    x: number
    y: number

    endPoint: Point

    startTime: number | null = null
    duration: number

    ctx: CanvasRenderingContext2D

    constructor(opts: SpaceParticleOptions) {
        this.ctx = opts.ctx
        this.size = this.getRandomSize()
        this.color = this.getRandomColor()
        this.boundaryX = opts.boundaryX
        this.boundaryY = opts.boundaryY
        this.startPoint = this.getRandomPosition()
        this.x = this.startPoint.x
        this.y = this.startPoint.y
        this.endPoint = this.getRandomPosition()
        this.duration = this.getDuration()
    }

    getRandomSize() {
        return getRandomNumBetween(1, 6)
    }

    getRandomColor() {
        const value = getRandomNumBetween(180, 200)
        return `rgb(${value}, ${value}, ${value})`
    }

    getRandomPosition() {
        return {
            x: getRandomNumBetween(0, this.boundaryX),
            y: getRandomNumBetween(0, this.boundaryY)
        }
    }

    getDuration() {
        // 25px / s
        return Math.floor(getDistanceBetweenTwoPoints(this.startPoint, this.endPoint)) * 50
    }

    continueMoving(isNew: boolean = false) {
        if(!isNew) {
            this.startPoint = {
                ...this.endPoint
            }
        }
        else {
            // new
            this.size = this.getRandomSize()
            this.color = this.getRandomColor()
            this.startPoint = this.getRandomPosition()
        }

        this.endPoint = this.getRandomPosition()
        this.duration = this.getDuration()
        this.startTime = null
    }

    draw() {
        this.ctx.fillStyle = this.color
        this.ctx.beginPath()
        this.ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size)
    }

}

interface SpaceParticleEffectOptions {
    ctx: CanvasRenderingContext2D
    boundaryX: number
    boundaryY: number
    num: number
}

export class SpaceParticleEffect {
    num: number
    particles: SpaceParticle[] = []

    ctx: CanvasRenderingContext2D
    boundaryX: number
    boundaryY: number

    isAnimOver: boolean

    constructor(opts: SpaceParticleEffectOptions) {
        this.ctx = opts.ctx
        this.boundaryX = opts.boundaryX
        this.boundaryY = opts.boundaryY
        this.num = opts.num
        this.isAnimOver = false

        // 创建 num 个粒子
        this.generateParticles()

        // 开始动画
        requestAnimationFrame(this.anim.bind(this))
    }

    generateParticles() {
        for (let i = 0; i < this.num; i++) {
            const particle = new SpaceParticle({
                ctx: this.ctx,
                boundaryX: this.boundaryX,
                boundaryY: this.boundaryY
            })
            this.particles.push(particle)
        }
    }

    anim(timestamp: number) {
        // 动画结束
        if (this.isAnimOver) return

        // 清空
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)

        // 渲染每个粒子
        this.particles.forEach(particle => {
            // 新创建的粒子
            if (!particle.startTime) {
                particle.startTime = timestamp
            }

            const elapsedMs = timestamp - particle.startTime

            const progress = Math.min(1, elapsedMs / particle.duration)

            particle.x = particle.startPoint.x + (particle.endPoint.x - particle.startPoint.x) * progress
            particle.y = particle.startPoint.y + (particle.endPoint.y - particle.startPoint.y) * progress

            particle.draw()

            // 到达目的地
            if (progress === 1) {
                if (Math.random() > 0.35) {
                    // 65% 的概率继续
                    particle.continueMoving()
                }
                else {
                    particle.continueMoving(true)
                }
            }
        })

        requestAnimationFrame(this.anim.bind(this))
    }

    overAnim() {
        this.isAnimOver = true
    }
}