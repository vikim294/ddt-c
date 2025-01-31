import { easeOut } from "../utils/math"
import { LayerType, Point, ScreenCanvas, Size } from "./canvas"

interface Options {
    logicalMapSize: Size
    viewportSize: Size

    mapCanvas: ScreenCanvas
    inactiveCanvas: ScreenCanvas
    activeCanvas: ScreenCanvas
    bombCanvas: ScreenCanvas
    explosionParticleCanvas: ScreenCanvas

    onViewportUpdate: () => void
}

type UpdateReason = 'playerMove'

export class Viewport {
    logicalMapSize: Size
    viewportSize: Size

    translate: Point

    startTranslate: Point | null = null
    targetTranslate: Point | null = null
    animDuration: number = 1000
    animStartTime: number | null = null
    isAnimPlaying: boolean = false

    isGamePreviewOver: boolean = false
    isDraggingMiniViewport: boolean = false

    mapCanvas: ScreenCanvas
    inactiveCanvas: ScreenCanvas
    activeCanvas: ScreenCanvas
    bombCanvas: ScreenCanvas
    explosionParticleCanvas: ScreenCanvas

    onViewportUpdate: () => void
    onViewportAnimOver: (() => void) | null = null

    constructor(options: Options) {
        this.logicalMapSize = options.logicalMapSize
        this.viewportSize = options.viewportSize

        this.translate = this.getSafeTranslateByFocusPoint({
            x: this.logicalMapSize.width / 2,
            y: this.logicalMapSize.height / 2,
        })

        this.mapCanvas = options.mapCanvas
        this.inactiveCanvas = options.inactiveCanvas
        this.activeCanvas = options.activeCanvas
        this.bombCanvas = options.bombCanvas
        this.explosionParticleCanvas = options.explosionParticleCanvas

        this.onViewportUpdate = options.onViewportUpdate
    }

    setViewportTranslate(translate: Point) {
        this.translate = translate
    }

    setStartTranslate() {
        this.startTranslate = {
            ...this.translate
        }
    }

    focusPointToTranslate(focusPoint: Point) {
        const baseX = this.viewportSize.width / 2
        const baseY = this.viewportSize.height / 2

        return {
            x: baseX - focusPoint.x,
            y: baseY - focusPoint.y
        }
    }

    // 得到 viewport中心位置为 focusPoint的 translate（如果越界，则为边界）
    getSafeTranslateByFocusPoint(focusPoint: Point) {
        // 检查 focusPoint是否越界
        let { x, y } = focusPoint
        const left = this.viewportSize.width / 2
        const right = this.logicalMapSize.width - (this.viewportSize.width) / 2
        const top = this.viewportSize.height / 2
        const bottom = this.logicalMapSize.height - (this.viewportSize.height) / 2

        // 越界判断
        if (x < left) {
            x = left
        }
        else if (x > right) {
            x = right
        }
        if (y < top) {
            y = top
        }
        else if (y > bottom) {
            y = bottom
        }

        return this.focusPointToTranslate({
            x,
            y
        })
    }

    setLayerTranslate(layerType: LayerType) {
        switch (layerType) {
            case 'map': {
                this.mapCanvas.setTranslate(this.translate)
                break;
            }

            case 'inactive': {
                this.inactiveCanvas.setTranslate(this.translate)
                break;
            }

            case 'active': {
                this.activeCanvas.setTranslate(this.translate)
                break;
            }

            case 'bomb': {
                this.bombCanvas.setTranslate(this.translate)
                break;
            }

            case 'explosionParticle': {
                this.explosionParticleCanvas.setTranslate(this.translate)
                break;
            }

            default: {
                throw new Error("invalid layerType!");
            }
        }
    }

    updateViewport(syncMiniMap: boolean, updateReason?: UpdateReason) {
        // updateViewport
        this.setLayerTranslate('map')
        this.setLayerTranslate('inactive')
        this.setLayerTranslate('active')

        // playerMove时，不更新无关的layer
        if(updateReason !== "playerMove") {
            this.setLayerTranslate('bomb')
            this.setLayerTranslate('explosionParticle')
        }   

        // 同步miniMap
        if (syncMiniMap) {
            this.onViewportUpdate()
        }
    }

    focusViewportOnTarget(target: Point, updateReason?: UpdateReason) {
        // 用户拖动miniMap时，禁用 viewport的跟随
        if(this.isDraggingMiniViewport) return

        // 播放 anim的过程中，禁用 viewport的跟随
        if(this.isAnimPlaying) return

        this.setViewportTranslate(this.getSafeTranslateByFocusPoint(target))
        this.updateViewport(true, updateReason)
        console.log('focusViewportOnTarget', this.translate)
    }

    // 将viewport 平滑地从 当前位置 -> 聚焦到target
    transitionViewportToTarget(target: Point, onViewportAnimOver?: () => void) {
        // 用户拖动miniMap时，禁用 viewport的动画
        if(this.isDraggingMiniViewport) return

        this.isAnimPlaying = true
        this.setStartTranslate()
        this.animStartTime = null
        this.targetTranslate = this.getSafeTranslateByFocusPoint(target)
        this.onViewportAnimOver = onViewportAnimOver || null
        console.log('transitionViewportToTarget', this.startTranslate, this.targetTranslate)
        requestAnimationFrame(this.anim.bind(this))
    }

    anim(timestamp: number) {
        if (!this.startTranslate || !this.targetTranslate) {
            return
        }

        if (!this.animStartTime) {
            this.animStartTime = timestamp
        }

        const progress = easeOut(Math.min((timestamp - this.animStartTime) / this.animDuration, 1))

        const translateX = this.startTranslate.x + (this.targetTranslate.x - this.startTranslate.x) * progress
        const translateY = this.startTranslate.y + (this.targetTranslate.y - this.startTranslate.y) * progress

        this.setViewportTranslate({
            x: Math.floor(translateX),
            y: Math.floor(translateY)
        })
        this.updateViewport(true)

        if (progress < 1) {
            requestAnimationFrame(this.anim.bind(this))
        }
        else if (progress === 1) {     
            // anim 结束
            this.isAnimPlaying = false     

            // 如果指定了回调，则执行回调
            if (this.onViewportAnimOver) {
                this.onViewportAnimOver()
                this.onViewportAnimOver = null
            }
        }
    }
}