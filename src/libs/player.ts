
// import { Socket } from "socket.io-client"
import { angleToRadian, getDistanceBetweenTwoPoints } from "../utils/math"
import { Canvas, MapCanvas, Point, pointOutOfMap, setCtxPathByMap, toCanvasCoordinateY, toCartesianCoordinateY } from "./canvas"
import { G, TRIDENT_ANGLE_DIFFERENCE } from "./constants"
import { SHELL_CRATER_50_round } from "./shellCraters"
import { MsgHandler } from "../App"

export type Direction = 'left' | 'right'

export interface Weapon {
    angleRange: number
    damage: number
}

export interface PlayerOptions {
  msgHandler: MsgHandler

  mapCanvas: MapCanvas
  inactiveCanvas: Canvas
  activeCanvas: Canvas
  bombCanvas: Canvas

  id: string
  name: string
  centerPoint: Point

  direction: Direction  

  healthMax: number

  weapon: Weapon
}

export interface BombTarget {
    x: number, y: number, damageRadius: number
}

export interface Bomb {
    x: number
    y: number

    v0Horizontal: number
    v0Vertical: number

    damageRadius: number

    targetX: number
    targetY: number
    bombSec: number
    isOutOfMapBoundary: boolean
}

export interface TridentBomb extends Bomb {
    isBombed: boolean
}

export class Player {
  msgHandler: MsgHandler

  mapCanvas: MapCanvas
  inactiveCanvas: Canvas
  activeCanvas: Canvas
  bombCanvas: Canvas

  id: string
  name: string

  centerPoint: Point
  static BOUNDING_BOX_LENGTH: number = 30
  direction: Direction  
  leftPoint: Point
  rightPoint: Point
  angle: number

  health: number
  healthMax: number

  weapon: Weapon
  weaponAngle: number

  firingPower: number

  numberOfFires: number
  bomb: Bomb
  firingTime: number
  
  isOperationDone: boolean
  isTrident: boolean
  tridentBombs: TridentBomb[]

  static HEALTH_BAR_WIDTH: number = 40
  static HEALTH_BAR_HEIGHT: number = 10

  constructor(options: PlayerOptions) {
    const {
      msgHandler,

      mapCanvas,
      inactiveCanvas,
      activeCanvas,
      bombCanvas,

      id,
      name,

      centerPoint,
      direction,

      healthMax,

      weapon,
    } = options
    this.msgHandler = msgHandler

    this.mapCanvas = mapCanvas
    this.inactiveCanvas = inactiveCanvas
    this.activeCanvas = activeCanvas
    this.bombCanvas = bombCanvas

    this.id = id
    this.name = name
    this.centerPoint = centerPoint
    this.direction = direction

    const surfacePoints = this.mapCanvas.getSurfacePointsByPointAndLength(this.centerPoint, Player.BOUNDING_BOX_LENGTH)
    this.leftPoint = surfacePoints[0]
    this.rightPoint = surfacePoints[surfacePoints.length - 1]
    this.angle = this.mapCanvas.getAngleByTwoTerrainPoints(this.leftPoint, this.rightPoint)

    this.health = healthMax
    this.healthMax = healthMax

    this.weapon = weapon
    this.weaponAngle = 0

    this.firingPower = 0

    this.numberOfFires = 1
    this.bomb = {
        x: 0,
        y: 0,

        v0Horizontal: 0,
        v0Vertical: 0,

        damageRadius: 0,

        targetX: 0,
        targetY: 0,
        bombSec: 0,
        isOutOfMapBoundary: false
    }
    this.firingTime = 0

    this.isOperationDone = true

    this.isTrident = false
    this.tridentBombs = []

    // this.drawPlayer()

    // this.logPlayerInfo()

    // if(this.id === this.CLIENT_PLAYER_ID) {
    //   this.registerListeners()
    // }
  }

  logPlayerInfo() {
    console.log(`
      left: ${this.leftPoint.x}, ${this.leftPoint.y},
      center: ${this.centerPoint.x}, ${this.centerPoint.y},
      right: ${this.rightPoint.x}, ${this.rightPoint.y},
      angle: ${this.angle}
    `)
  }

  updateLocationData(locationData: {
      centerPoint: {
          x: number;
          y: number;
      };
      leftPoint: {
          x: number;
          y: number;
      };
      rightPoint: {
          x: number;
          y: number;
      };
      angle: number;
  }) {
    this.centerPoint = locationData.centerPoint
    this.leftPoint = locationData.leftPoint
    this.rightPoint = locationData.rightPoint
    this.angle = this.direction === 'right' ? locationData.angle : -locationData.angle
  }

  drawPlayer() {
    if(this.msgHandler.isActivePlayer(this.id)) {
      this.drawPlayerByIsActive(this.activeCanvas)
    }
    else {
      this.drawPlayerByIsActive(this.inactiveCanvas)
    }
  }

  drawPlayerByIsActive(canvas: Canvas) {
    canvas.ctx.clearRect(0, 0, canvas.el.width, canvas.el.height)
    canvas.ctx.save()

    canvas.ctx.translate(this.centerPoint.x, this.centerPoint.y)
    this.drawPlayerCenterPoint(canvas)
    this.drawPlayerBoundingBox(canvas)

    canvas.ctx.save()
    if(this.id === this.msgHandler.getClientPlayerId()) {
      canvas.ctx.fillStyle = '#36D'
      canvas.ctx.strokeStyle = '#36D'
    }
    else {
      canvas.ctx.fillStyle = '#ff0000'
      canvas.ctx.strokeStyle = '#ff0000'
    }
    canvas.ctx.textAlign = 'center'

    this.drawPlayerName(canvas)
    this.drawPlayerHealth(canvas)
    
    canvas.ctx.restore()

    if(this.direction === 'right') {
        canvas.ctx.rotate(-angleToRadian(this.angle))
    }
    else if(this.direction === 'left') {
        canvas.ctx.rotate(angleToRadian(this.angle))
    }
    
    this.drawPlayerDirectionIndicator(canvas)
    canvas.ctx.restore()
  }

  drawPlayerCenterPoint(canvas: Canvas) {
      canvas.ctx.strokeStyle = '#000'
      canvas.ctx.beginPath()
      canvas.ctx.arc(0, 0, 1, 0, Math.PI * 2)
      canvas.ctx.stroke()
  }

  drawPlayerBoundingBox(canvas: Canvas) {
      canvas.ctx.strokeStyle = '#36D'
      canvas.ctx.beginPath()
      canvas.ctx.strokeRect(- Player.BOUNDING_BOX_LENGTH / 2, - Player.BOUNDING_BOX_LENGTH / 2, Player.BOUNDING_BOX_LENGTH, Player.BOUNDING_BOX_LENGTH)
  }

  drawPlayerDirectionIndicator(canvas: Canvas) {
      canvas.ctx.strokeStyle = 'blue'
      canvas.ctx.beginPath()
      canvas.ctx.moveTo(0, 0)
      if(this.direction === 'right') {
        canvas.ctx.lineTo(Player.BOUNDING_BOX_LENGTH / 2, 0)
      }
      else if(this.direction === 'left') {
        canvas.ctx.lineTo(-Player.BOUNDING_BOX_LENGTH / 2, 0)
      }
      canvas.ctx.stroke()
  }

  drawPlayerName(canvas: Canvas) {
    canvas.ctx.fillText(this.name, 0, Player.BOUNDING_BOX_LENGTH);
  }

  drawPlayerHealth(canvas: Canvas) {
      canvas.ctx.beginPath()
      canvas.ctx.strokeRect(0 - Player.HEALTH_BAR_WIDTH / 2, Player.BOUNDING_BOX_LENGTH + Player.HEALTH_BAR_HEIGHT, Player.HEALTH_BAR_WIDTH, Player.HEALTH_BAR_HEIGHT)
      const ratio = this.health / this.healthMax
      canvas.ctx.fillRect(0 - Player.HEALTH_BAR_WIDTH / 2, Player.BOUNDING_BOX_LENGTH + Player.HEALTH_BAR_HEIGHT, Player.HEALTH_BAR_WIDTH * ratio, Player.HEALTH_BAR_HEIGHT)
  }

//   registerListeners() {
//     document.body.addEventListener('keydown', (ev) => {
//         ev.preventDefault()
//         // console.log(ev)
        
//         if(!this.isActive) return

//         if(ev.key === 'ArrowRight') {
//             // this.playerMoves('right')

//             this.socket.emit('move', 'right')
//         }
//         else if(ev.key === 'ArrowLeft') {
//             // this.playerMoves('left')

//             this.socket.emit('move', 'left')
//         }
//         else if(ev.key === 'ArrowUp') {
//             // adjustWeaponAngle('up')
//         }
//         else if(ev.key === 'ArrowDown') {
//             // adjustWeaponAngle('down')
//         }
//         else if(ev.key === ' ') {
//             // 蓄力
//             // adjustFiringPower()
//         }
//     })
//   }

  playerMoves(direction: Direction) {
      // this.logPlayerInfo()

      if(this.direction !== direction) {
        this.direction = direction
          // todo
          // 如果方向改变了，则只调整角度，不移动...


      }

      if(direction === 'right' || direction === 'left') {
          if(this.isPlayerBlocked()) {
              return
          }

          if(this.willPlayerFall()) {
              console.log('fall!')

              this.playerFall()

              return
          }

          if(direction === 'right') {
            this.calculateAndDrawPlayerByPoint(this.rightPoint)
          }
          else {
            this.calculateAndDrawPlayerByPoint(this.leftPoint)
          }
      }
  }

  calculateAndDrawPlayerByPoint(point: Point) {
      const locationData = this.calculateLocationDataByCenterPoint(point)
      if(locationData) {
          this.updateLocationData(locationData)
          this.drawPlayer()
      }
      else {
          // 说明如果再走一步，那么左右两点的x将会相同！
          // 所以需要根据目前的位置（目前 左右两点的x是不相同的！），决定应该block 还是 fall
          if(this.direction === 'right') {
              if(this.rightPoint.y > this.leftPoint.y) {
                  // fall
                  this.playerFall()
              }
              else if(this.rightPoint.y < this.leftPoint.y) {
                  // block
                  // 什么也不用干
              }
          }
          else {
              // left
              if(this.leftPoint.y > this.rightPoint.y) {
                  // fall
                  this.playerFall()
              }
              else if(this.leftPoint.y < this.rightPoint.y) {
                  // block
                  // 什么也不用干
              }
          }
      }
  }

  calculateLocationDataByCenterPoint(point: Point) {
      const surfacePoints = this.mapCanvas.getSurfacePointsByPointAndLength(point, Player.BOUNDING_BOX_LENGTH)
      const leftPoint = surfacePoints[0]
      const rightPoint = surfacePoints[surfacePoints.length - 1]
      
      if(leftPoint.x === rightPoint.x) {
          console.info('calculatePlayerData 左右两点的x相同!')
          return null
      }
      const angle = this.mapCanvas.getAngleByTwoTerrainPoints(leftPoint, rightPoint)
      const data = {
          centerPoint: point,
          leftPoint,
          rightPoint,
          angle
      }
      // if(!player.weaponAngle) {
      //     // 初始的 weaponAngle
      //     data.weaponAngle = Math.floor(player.weapon.angleRange / 2)
      // }
      return data
  }

  isPlayerBlocked() {
      if(this.direction === 'right') {
          if(this.leftPoint.x !== this.rightPoint.x) {
              // 那么就能区分出左右两点
              if(this.rightPoint.y < this.centerPoint.y) {
                  // 右点在中点的上方
                  if(this.rightPoint.x === this.centerPoint.x) {
                      console.info('右点在中点的正上方')
                      return true
                  }
                  
                  if(this.leftPoint.x < this.centerPoint.x && this.rightPoint.x < this.centerPoint.x) {
                      console.info('左右两点在中点的左侧，且右点在中点的上方')
                      return true
                  }
              }

              return false
          }
          else {
              console.info('isPlayerBlocked 左右两点的x相同!')
              return true
          }
          
      }
  }

  willPlayerFall() {
      if(this.direction === 'right') {
          if(this.leftPoint.x !== this.rightPoint.x) {
              // 那么就能区分出左右两点，左点一定在右点的左侧
          
              if(this.rightPoint.x === this.centerPoint.x) {
                  console.info('右点和中点的x相同')
                  return true
              }
              else if(this.rightPoint.x < this.centerPoint.x) {
                  console.info('右点在中点的左侧')
                  return true
              }
                
              return false
          }
          else {
              if(this.leftPoint.x <= this.centerPoint.x) {
                  // 左右两点和中点的x相同，或 左右两点都在中点左侧
                  return true
              }
              else {
                  // 左右两点都在中点右侧
                  return false
              }
          }
      }
      else {
          if(this.leftPoint.x !== this.rightPoint.x) {
              // 那么就能区分出左右两点，左点一定在右点的左侧
          
              if(this.leftPoint.x === this.centerPoint.x) {
                  console.info('左点和中点的x相同')
                  return true
              }
              else if(this.leftPoint.x > this.centerPoint.x) {
                  console.info('左点在中点的右侧')
                  return true
              }
                
              return false
          }
          else {
              if(this.leftPoint.x >= this.centerPoint.x) {
                  // 左右两点和中点的x相同，或 左右两点都在中点右侧
                  return true
              }
              else {
                  // 左右两点都在中点右侧
                  return false
              }
          }
      }
  }

  playerFall() {
      const inc = this.direction === 'right' ? 5 : -5
      const newPlayerX = this.centerPoint.x + inc
      const { data } = this.mapCanvas.ctx.getImageData(newPlayerX, this.centerPoint.y, 1, this.mapCanvas.el.height - this.centerPoint.y)
      for(let i = 0; i < data.length; i += 4) {
          const index = i / 4
          const r = data[i]
          // const g = data[i + 1]
          // const b = data[i + 2]
          // const a = data[i + 3]
          const x = newPlayerX
          const y = this.centerPoint.y + index

          if(r === 255) {
              // console.log(x, y, a)
              this.calculateAndDrawPlayerByPoint({
                  x,
                  y
              })
              return
          }
      }

      console.info('掉进地图外了！')
  }

  // --------
  playerStartToFire() {
    const firingAngle = this.angle + this.weaponAngle
    const angle = this.direction === 'right' ? firingAngle : 180 - firingAngle
    const power = this.firingPower

    const v0 = power * 10
    // console.log('v0', v0)
    let v0Horizontal = v0 * Math.cos(angleToRadian(angle))
    // console.log('v0Horizontal', v0Horizontal)

    // 垂直方向
    let v0Vertical = v0 * Math.sin(angleToRadian(angle))

    this.bomb = {
        ...this.bomb,

        // bomb从 player中心上方 PLAYER_BOUNDING_BOX_LENGTH 处发射
        x: this.centerPoint.x,
        y: this.centerPoint.y - Player.BOUNDING_BOX_LENGTH,

        v0Horizontal,
        v0Vertical,

        damageRadius: 50,
    }

    this.playerFires()
  }

  playerFires() {
    this.numberOfFires--

    this.preCalculateBombData()
    this.firingTime = +new Date()
    this.drawBomb()
  }

  preCalculateBombData() {
    let sec = 0
    let _bomb = {
        ...this.bomb
    }

    const track = []
    while(!pointOutOfMap(_bomb, this.mapCanvas.el.width, this.mapCanvas.el.height)) {
        // console.log('preCalculate')
        track.push({
            x: _bomb.x,
            y: _bomb.y,
            sec
        })

        sec += 0.004
        const x = this.centerPoint.x + _bomb.v0Horizontal * sec
        const y = toCartesianCoordinateY(this.centerPoint.y - Player.BOUNDING_BOX_LENGTH, this.mapCanvas.el.height) + _bomb.v0Vertical * sec + 1 / 2 * G * sec * sec
        _bomb.x = Math.floor(x)
        _bomb.y = Math.floor(toCanvasCoordinateY(y, this.mapCanvas.el.height))
    }

    // console.log('pointOutOfMap! sec:', sec)
    // console.log('track', track)

    // this.mapCanvas.drawTrack(track)

    // getTarget
    for(let point of track) {
        const {
            x, y, sec
        } = point
        const { data } = this.mapCanvas.ctx.getImageData(x, y, 1, 1)
        const r = data[0]
        const g = data[1]
        const b = data[2]
        // console.log('x, y', x, y, 'r, g, b', r, g, b)

        if(!(r === 0 && g === 0 && b === 0)) {
            this.bomb.targetX = x
            this.bomb.targetY = y
            this.bomb.bombSec = sec

            console.log('bomb inside map ')
            // console.log(this.bomb)
            return
        }
    }

    console.log('bomb out of map boundary')
    const {
        x, y
    } = track[track.length - 1]
    this.bomb.targetX = x
    this.bomb.targetY = y
    this.bomb.bombSec = sec
    this.bomb.isOutOfMapBoundary = true
  } 

  drawBomb() {
    const elapsedSec = (+new Date() - this.firingTime) / 1000

    if(elapsedSec >= this.bomb.bombSec) {
        this.bombCanvas.ctx.clearRect(0, 0, this.bombCanvas.el.width, this.bombCanvas.el.height)

        if(!this.bomb.isOutOfMapBoundary) {
            const target = {
                x: this.bomb.x,
                y: this.bomb.y,
                damageRadius: this.bomb.damageRadius
            }
            this.bombTarget(target, this.mapCanvas.ctx)

            // 对player的effect
            this.msgHandler.checkBombEffect(target)
        }

        if(this.numberOfFires !== 0) {
            // 继续发射
            setTimeout(() => {
                this.playerFires()
            }, 2000);
        }
        else {
            // 重置 this.firingPower
            this.msgHandler.resetActivePlayerFiringPower()
            // console.log('startNextTurn')
            this.msgHandler.startNextTurn()
        }

        return
    }

    requestAnimationFrame(this.drawBomb.bind(this))

    this.bombCanvas.ctx.clearRect(0, 0, this.bombCanvas.el.width, this.bombCanvas.el.height)
    this.bombCanvas.ctx.beginPath()
    this.bombCanvas.ctx.arc(this.bomb.x, this.bomb.y, 1, 0, Math.PI * 2)
    this.bombCanvas.ctx.stroke()

    // 计算在笛卡尔坐标系下的 x 和 y
    const x = this.centerPoint.x + this.bomb.v0Horizontal * elapsedSec
    // bomb从 player中心上方 PLAYER_BOUNDING_BOX_LENGTH 处发射
    const y = toCanvasCoordinateY(toCartesianCoordinateY(this.centerPoint.y - Player.BOUNDING_BOX_LENGTH, this.bombCanvas.el.height) + this.bomb.v0Vertical * elapsedSec + 1 / 2 * G * elapsedSec * elapsedSec, this.bombCanvas.el.height)
    // 最终要绘制的bomb的坐标 需要用canvas的坐标系
    this.bomb.x = Math.floor(x)
    this.bomb.y = Math.floor(y)
  }

  playerStartToFireTrident() {
    const firingAngle = this.angle + this.weaponAngle
    const angle = this.direction === 'right' ? firingAngle : 180 - firingAngle
    const power = this.firingPower
    const v0 = power * 10

    this.tridentBombs = []
    for(let i = 0; i < 3; i++) {
        let newAngle = angle
        if(i === 0) {
            newAngle -= TRIDENT_ANGLE_DIFFERENCE
        }
        else if(i === 2) {
            newAngle += TRIDENT_ANGLE_DIFFERENCE
        }

        const bomb: TridentBomb = {
            // bomb从 player中心上方 PLAYER_BOUNDING_BOX_LENGTH 处发射
            x: this.centerPoint.x,
            y: this.centerPoint.y - Player.BOUNDING_BOX_LENGTH,
    
            v0Horizontal: v0 * Math.cos(angleToRadian(newAngle)),
            v0Vertical: v0 * Math.sin(angleToRadian(newAngle)),
    
            damageRadius: 50,
            isBombed: false,

            targetX: 0,
            targetY: 0,
            bombSec: 0,
            isOutOfMapBoundary: false
        }
    
        this.tridentBombs.push(bomb)
    }


    this.playerFiresTrident()
  }

  playerFiresTrident() {
    this.numberOfFires--

    this.preCalculateTridentData()

    this.firingTime = +new Date()
    this.drawTrident()
  }

  preCalculateTridentData() {
    const offscreenMapCanvasEl = document.createElement('canvas')
    offscreenMapCanvasEl.width = this.mapCanvas.el.width
    offscreenMapCanvasEl.height = this.mapCanvas.el.height
    const offscreenCtx = offscreenMapCanvasEl.getContext('2d', {
        willReadFrequently: true
    })

    if(!offscreenCtx) return

    // 复制 map到 offscreenMap
    offscreenCtx.drawImage(this.mapCanvas.el, 0, 0)

    for(let i = 0; i < 3; i++) {
        const bomb = this.tridentBombs[i]
        let sec = 0
        let _bomb = {
            ...bomb
        }

        const track = []
        while(!pointOutOfMap(_bomb, this.mapCanvas.el.width, this.mapCanvas.el.height)) {
            // console.log('preCalculate')
            track.push({
                x: _bomb.x,
                y: _bomb.y,
                sec
            })

            sec += 0.004
            const x = this.centerPoint.x + _bomb.v0Horizontal * sec
            const y = toCartesianCoordinateY(this.centerPoint.y - Player.BOUNDING_BOX_LENGTH, this.mapCanvas.el.height) + _bomb.v0Vertical * sec + 1 / 2 * G * sec * sec
            _bomb.x = Math.floor(x)
            _bomb.y = Math.floor(toCanvasCoordinateY(y, this.mapCanvas.el.height))
        }

        // console.log('pointOutOfMap! sec:', sec)
        // console.log('track', track)

        // drawTrack(track)

        // getTarget
        let isBombOutOfMapBoundary = true
        for(let point of track) {
            const {
                x, y, sec
            } = point
            const { data } = offscreenCtx.getImageData(x, y, 1, 1)
            const r = data[0]
            const g = data[1]
            const b = data[2]
            // console.log('x, y', x, y, 'r, g, b', r, g, b)

            if(!(r === 0 && g === 0 && b === 0)) {
                bomb.targetX = x
                bomb.targetY = y
                bomb.bombSec = sec

                console.log(i, bomb)
                isBombOutOfMapBoundary = false

                // 
                this.bombTarget({
                    x,
                    y,
                    damageRadius: bomb.damageRadius
                }, offscreenCtx)

                break
            }
        }

        if(isBombOutOfMapBoundary) {
            console.log('bomb', i, 'out of map boundary')
            const {
                x, y
            } = track[track.length - 1]
            bomb.targetX = x
            bomb.targetY = y
            bomb.bombSec = sec
            bomb.isOutOfMapBoundary = true
        }
    }
  }

  drawTrident() {
    if(this.tridentBombs.every(bomb => bomb.isBombed)) {
        // 全部bomb
        console.log('全部bomb')

        if(this.numberOfFires !== 0) {
            // 继续发射
            setTimeout(() => {
                this.playerStartToFireTrident()
            }, 2000);
        }
        else {
            // 重置 this.firingPower
            this.msgHandler.resetActivePlayerFiringPower()
            this.msgHandler.startNextTurn()
        }

        return
    }

    const elapsedSec = (+new Date() - this.firingTime) / 1000

    requestAnimationFrame(this.drawTrident.bind(this))

    this.bombCanvas.ctx.clearRect(0, 0, this.bombCanvas.el.width, this.bombCanvas.el.height)

    for(let i = 0; i < 3; i++) {
        const bomb = this.tridentBombs[i]

        if(bomb.isBombed) continue

        // 如果bomb到达了target
        if(!bomb.isBombed && elapsedSec >= bomb.bombSec) {
            bomb.isBombed = true
    
            if(!bomb.isOutOfMapBoundary) {
                const target = {
                    x: bomb.x,
                    y: bomb.y,
                    damageRadius: bomb.damageRadius
                }
                this.bombTarget(target, this.mapCanvas.ctx)
                // 对player的effect
                this.msgHandler.checkBombEffect(target)
            }

            continue
        }

        this.bombCanvas.ctx.beginPath()
        this.bombCanvas.ctx.arc(bomb.x, bomb.y, 1, 0, Math.PI * 2)
        this.bombCanvas.ctx.stroke()

        // 计算在笛卡尔坐标系下的 x 和 y
        const x = this.centerPoint.x + bomb.v0Horizontal * elapsedSec
        // bomb从 player中心上方 PLAYER_BOUNDING_BOX_LENGTH 处发射
        const y = toCanvasCoordinateY(toCartesianCoordinateY(this.centerPoint.y - Player.BOUNDING_BOX_LENGTH, this.mapCanvas.el.height) + bomb.v0Vertical * elapsedSec + 1 / 2 * G * elapsedSec * elapsedSec, this.mapCanvas.el.height)
        // 最终要绘制的bomb的坐标 需要用canvas的坐标系
        bomb.x = Math.floor(x)
        bomb.y = Math.floor(y)
    }
  }

  bombTarget({x, y, damageRadius}: BombTarget, ctx: CanvasRenderingContext2D) {
    const offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = this.mapCanvas.el.width
    offscreenCanvas.height = this.mapCanvas.el.height
    const offscreenCanvasCtx = offscreenCanvas.getContext('2d')!
    offscreenCanvasCtx.lineWidth = ctx.lineWidth

    // 先fill => 再stroke(destination-out) -> 得到 【内部填充】
    // offscreenCanvasCtx.beginPath()
    // offscreenCanvasCtx.arc(x, y, damageRadius, 0, Math.PI * 2)
    offscreenCanvasCtx.save()
    offscreenCanvasCtx.translate(x - damageRadius, y - damageRadius)

    setCtxPathByMap(offscreenCanvasCtx, SHELL_CRATER_50_round)
    offscreenCanvasCtx.fill()

    offscreenCanvasCtx.globalCompositeOperation = 'destination-out'
    offscreenCanvasCtx.stroke()

    offscreenCanvasCtx.restore()

    // 然后将offscreenCanvas 以destination-out的方式，绘制到 mapCanvas上
    ctx.globalCompositeOperation = 'destination-out'
    ctx.drawImage(offscreenCanvas, 0, 0)

    // 最后绘制描边
    // ctx.beginPath()
    ctx.globalCompositeOperation = 'source-atop'
    // ctx.arc(x, y, damageRadius, 0, Math.PI * 2)

    this.mapCanvas.ctx.save()

    this.mapCanvas.ctx.translate(x - damageRadius, y - damageRadius)

    setCtxPathByMap(ctx, SHELL_CRATER_50_round)
    ctx.stroke()

    this.mapCanvas.ctx.restore()
  }


}

export function checkBombEffect(bombTarget: BombTarget, player: Player) {
    const {
        x,
        y,
        damageRadius
    } = bombTarget

    // 对 active player的影响
    // 判断爆炸点 和 player2中心 的距离 是否 <= damageRadius
    const d1 = getDistanceBetweenTwoPoints({
        x,
        y
    }, player.centerPoint)
    if(d1 <= damageRadius) {
        console.log(`player ${player.id} gets hurt!`)
        // player hp 计算
        const newHealth = player.health - player.weapon.damage
        if(newHealth > 0) {
            player.health = newHealth
        }
        else {
            player.health = 0
            console.log(`--- player ${player.id} is dead! ---`)
        }
        
        const { data } = player.mapCanvas.ctx.getImageData(player.centerPoint.x, player.centerPoint.y, 1, player.mapCanvas.el.height - player.centerPoint.y)
        let isPlayerOutOfMapBoundary = true
        for(let i = 0; i < data.length; i += 4) {
            const index = i / 4
            const r = data[i]
            // const g = data[i + 1]
            // const b = data[i + 2]
            // const a = data[i + 3]
            const x = player.centerPoint.x
            const y = player.centerPoint.y + index

            if(r === 255) {
                // console.log(x, y, a)
                isPlayerOutOfMapBoundary = false
                player.calculateAndDrawPlayerByPoint({
                    x,
                    y
                })

                break
            }
        }

        if(isPlayerOutOfMapBoundary) {
            console.info(`player ${player.id} 掉进地图外了！`)
        }
    }
}