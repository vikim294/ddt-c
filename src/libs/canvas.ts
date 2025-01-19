import { MAP_BOUNDARY_GAP } from "./constants"


export interface Point {
  x: number
  y: number
}

interface CanvasOptions {
  el?: HTMLCanvasElement
  willReadFrequently?: boolean
}

type Map = string[][]

export class Canvas {
  readonly el: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  readonly dpr: number

  static logicalWidth = 1440
  static logicalHeight = 900

  constructor(options: CanvasOptions) {
    const {
      el,
      willReadFrequently,
    } = options

    if(el) {
      this.el = el
    }
    else {
      this.el = document.createElement('canvas')
    }

    this.dpr = window.devicePixelRatio || 1

    // css
    this.el.style.width = Canvas.logicalWidth +'px'
    this.el.style.height = Canvas.logicalHeight +'px'

    this.ctx = this.el.getContext('2d', {
        willReadFrequently
    }) as CanvasRenderingContext2D 
  }

}

interface LogicalCanvasOptions extends CanvasOptions {
  initMap?: Map
}

export class LogicalCanvas extends Canvas {

  constructor(options?: LogicalCanvasOptions) {
    super({
      ...options,
      willReadFrequently: true,
    })

    // logical canvas
    this.el.width = Canvas.logicalWidth
    this.el.height = Canvas.logicalHeight

    this.ctx.fillStyle = '#00ff00'
    this.ctx.strokeStyle = '#ff0000'
    this.ctx.lineWidth = 2

    if(options?.initMap) {
      drawMap(this.el, this.ctx, options.initMap)
    }
  }

  toCartesianCoordinateY(y: number) {
    return this.el.height - y
  }

  /**
   * 以point为中心，length为边长的正方形内
   */
  getSurfacePointsByPointAndLength(point: Point, length: number) {
      console.log('point', point, 'length', length)
      const {
        x, y
      } = point

      const res = []
      const { data } = this.ctx.getImageData(x - length / 2, y - length / 2, length, length)
      for(let col = 0; col < length; col++) {
          for(let row = 0; row < length; row++) {
              const index = (row * length + col) * 4
              // console.log(data[index])
              const r = data[index]
              const g = data[index + 1]
              if(r === 255) {
                  res.push({
                      x: col + x - length / 2 + 1,
                      y: row + y - length / 2 + 1,
                  })
                  break
              } 
              else if(g === 255) {
                  break
              }
          }
      }
      console.log('res', res)
      return res
  }

  getAngleByTwoTerrainPoints(pointA: Point, pointB: Point) {
      // console.log('pointA, pointB', pointA, pointB)
      const dy = this.toCartesianCoordinateY(pointA.y) - this.toCartesianCoordinateY(pointB.y)
      const dx = pointA.x - pointB.x
      const radian = Math.atan(dy / dx)
      // PI = 180°
      const angle = 180 / Math.PI * radian
      // console.log('angle', angle)
      return Math.floor(angle)
  }

} 

export class DisplayedCanvas extends Canvas {


  constructor(options: CanvasOptions) {
    super({
      ...options,
      willReadFrequently: false
    })

    // physical canvas
    this.el.width = Canvas.logicalWidth * this.dpr
    this.el.height = Canvas.logicalHeight * this.dpr

    this.ctx.scale(this.dpr, this.dpr)

    this.ctx.imageSmoothingEnabled = false; 
  }

  drawTrack(track: {
    x: number
    y: number
  }[] = []) {
      this.ctx.save()

      this.ctx.globalCompositeOperation = 'source-over'
      this.ctx.beginPath()
      track.forEach((point, index) => {
          const {
              x, y
          } = point
          if(index === 0) {
              this.ctx.moveTo(x, y)
          }
          else {
              this.ctx.lineTo(x, y)
          }
      })
      this.ctx.stroke()

      this.ctx.restore()
  }

  syncWithLogicalCanvas(logicalMapCanvas: HTMLCanvasElement, logicalBombImpactCanvas: HTMLCanvasElement) {
    const offscreenCanvas = new OffscreenCanvas(LogicalCanvas.logicalWidth, LogicalCanvas.logicalHeight)
    const offscreenCanvasCtx = offscreenCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D 
    offscreenCanvasCtx.reset()
    // 把 logicalMapCanvas 绘制到 offscreenCanvas
    offscreenCanvasCtx.drawImage(logicalMapCanvas, 0, 0)
    // 把 logicalBombImpactCanvas 绘制到 offscreenCanvas (source-atop)
    offscreenCanvasCtx.globalCompositeOperation = 'source-atop'
    offscreenCanvasCtx.drawImage(logicalBombImpactCanvas, 0, 0)

    // 把 offscreenCanvas 绘制到 displayed canvas
    this.ctx.clearRect(0, 0, this.el.width, this.el.height)
    this.ctx.drawImage(offscreenCanvas, 0, 0, Canvas.logicalWidth, Canvas.logicalHeight, 0, 0, Canvas.logicalWidth, Canvas.logicalHeight);
  }

}

export function setCtxPathByMap(ctx: CanvasRenderingContext2D, partMap: string[]) {
  partMap.forEach((item, index) => {
      const x = +item.split(',')[0]
      const y = +item.split(',')[1]
      if(index === 0) {
          ctx.beginPath()
          ctx.moveTo(x, y)
      }
      else {
          ctx.lineTo(x, y)
      }
  })
  ctx.closePath()
}

function drawMap(el: HTMLCanvasElement, ctx: CanvasRenderingContext2D, map: Map) {
  ctx.clearRect(0, 0, el.width, el.height)

  // 先得到所有部分的 内部填充 绘制到 map上
  const offscreenCanvas = document.createElement('canvas')
  offscreenCanvas.width = el.width
  offscreenCanvas.height = el.height
  const offscreenCanvasCtx = offscreenCanvas.getContext('2d')!

  offscreenCanvasCtx.fillStyle = ctx.fillStyle
  offscreenCanvasCtx.lineWidth = ctx.lineWidth
  map.forEach(partMap => {
      // 先fill => 再stroke(destination-out) -> 得到 【内部填充】
      offscreenCanvasCtx.clearRect(0, 0, el.width, el.height)
      setCtxPathByMap(offscreenCanvasCtx, partMap)
      offscreenCanvasCtx.fill()
      offscreenCanvasCtx.save()
      // 以2像素进行 destination-out
      offscreenCanvasCtx.globalCompositeOperation = 'destination-out'
      offscreenCanvasCtx.stroke()
      offscreenCanvasCtx.restore()
      // 绘制到 map上
      ctx.drawImage(offscreenCanvas, 0, 0)
  })

  // 最后绘制描边
  map.forEach(partMap => {
      setCtxPathByMap(ctx, partMap)
      ctx.stroke()
  })
}


export function pointOutOfMap(point: Point, mapWidth: number, mapHeight: number) {
  const {
      x, y
  } = point
  return (x < 0 - MAP_BOUNDARY_GAP || x > mapWidth + MAP_BOUNDARY_GAP || y > mapHeight + MAP_BOUNDARY_GAP)
}

export function toCartesianCoordinateY(y: number, mapHeight: number) {
  return mapHeight - y
}

export function toCanvasCoordinateY(y: number, mapHeight: number) {
  return toCartesianCoordinateY(y, mapHeight)
}

