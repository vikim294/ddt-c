
import { Socket } from "socket.io-client"
import { v4 as uuidv4 } from "uuid";
import { angleToRadian, getDistanceBetweenTwoPoints, radianToAngle } from "../utils/math"
import { Canvas, ScreenCanvas, LogicalCanvas, Point, pointOutOfMap, toCanvasCoordinateY, toCartesianCoordinateY } from "./canvas"
import { BOMB_FIRING_INTERVAL, G, PLAYER_MOVING_DURATION, TRIDENT_ANGLE_DIFFERENCE } from "./constants"
import { MsgHandler } from "./msgHandler"
// import { SHELL_CRATER_50_round } from "./shellCraters"
import { Viewport } from "./viewport"


export type Direction = 'left' | 'right'

export interface Weapon {
    angleRange: number
    damage: number

    bombImage: HTMLImageElement
}

export interface PlayerOptions {
  msgHandler: MsgHandler

  logicalMapCanvas: LogicalCanvas
  mapCanvas: ScreenCanvas
  bombImpactCanvas: ScreenCanvas
  inactiveCanvas: ScreenCanvas
  activeCanvas: ScreenCanvas
  bombCanvas: ScreenCanvas
  bombDrawingOffscreenCanvas: LogicalCanvas
  explosionParticleCanvas: ScreenCanvas
  testCanvas: ScreenCanvas

  viewport: Viewport
  miniMap: ScreenCanvas

  id: number
  name: string
  centerPoint: Point

  direction: Direction  

  healthMax: number

  weapon: Weapon
}

export interface BombTarget {
    bombId: string
    x: number
    y: number
    damageRadius: number
    bombAngle?: number
}

export interface Bomb {
    id: string
    x: number
    y: number

    v0Horizontal: number
    v0Vertical: number

    size: number
    damageRadius: number

    track: {
        x: number
        y: number
        sec: number
        bombAngle?: number
    }[]
    targetX: number
    targetY: number
    bombSec: number
    isOutOfMapBoundary: boolean
    firingTime: number
}

export class Player {
  msgHandler: MsgHandler

  logicalMapCanvas: LogicalCanvas
  mapCanvas: ScreenCanvas
  bombImpactCanvas: ScreenCanvas
  inactiveCanvas: ScreenCanvas
  activeCanvas: ScreenCanvas
  bombCanvas: ScreenCanvas
  bombDrawingOffscreenCanvas: LogicalCanvas
  explosionParticleCanvas: ScreenCanvas
  testCanvas: ScreenCanvas

  viewport: Viewport
  miniMap: ScreenCanvas

  id: number
  name: string

  centerPoint: Point
  static BOUNDING_BOX_LENGTH: number = 30
  direction: Direction  
  leftPoint: Point
  rightPoint: Point
  movingStartPoint: Point
  preCalculatedPositionData: {
      leftEndPoint: Point,
      standPoint: Point,
      rightEndPoint: Point,
      angle: number
  }
  angle: number

  isMoving: boolean
  keydownTimer: number | null
  movingTimer: number | null
  isFallingDown: boolean
  fallStartPoint: Point
  fallTargetPoint: Point
  fallDuration: number
  onFallingAnimOver: (() => void) | null

  health: number
  healthMax: number

  weapon: Weapon
  weaponAngle: number

  firingPosition: Point
  firingPower: number

  numberOfFires: number
  bombsData: Bomb[]
  firingTime: number
  
  isOperationDone: boolean
  isTrident: boolean
  tridentBombs: Bomb[]
  isPaperPlane: boolean

  static HEALTH_BAR_WIDTH: number = 40
  static HEALTH_BAR_HEIGHT: number = 10

  constructor(options: PlayerOptions) {
    const {
      msgHandler,

      logicalMapCanvas,
      mapCanvas,
      bombImpactCanvas,
      inactiveCanvas,
      activeCanvas,
      bombCanvas,
      bombDrawingOffscreenCanvas,
      explosionParticleCanvas,
      testCanvas,

      viewport,
      miniMap,

      id,
      name,

      centerPoint,
      direction,

      healthMax,

      weapon,
    } = options
    this.msgHandler = msgHandler

    this.logicalMapCanvas = logicalMapCanvas
    this.mapCanvas = mapCanvas
    this.bombImpactCanvas = bombImpactCanvas
    this.inactiveCanvas = inactiveCanvas
    this.activeCanvas = activeCanvas
    this.bombCanvas = bombCanvas
    this.bombDrawingOffscreenCanvas = bombDrawingOffscreenCanvas
    this.explosionParticleCanvas = explosionParticleCanvas
    this.testCanvas = testCanvas

    this.viewport = viewport
    this.miniMap = miniMap

    this.id = id
    this.name = name
    this.centerPoint = centerPoint
    this.direction = direction
    const surfacePoints = this.logicalMapCanvas.getSurfacePointsByPointAndLength(this.centerPoint, Player.BOUNDING_BOX_LENGTH)
    console.log('new Player:', this.centerPoint, surfacePoints)
    this.leftPoint = surfacePoints[0]
    this.rightPoint = surfacePoints[surfacePoints.length - 1]
    this.movingStartPoint = {
        x: -1,
        y: -1
    }
    this.preCalculatedPositionData = {
        leftEndPoint: {
            x: -1,
            y: -1
        },
        standPoint: {
            x: -1,
            y: -1
        },
        rightEndPoint: {
            x: -1,
            y: -1
        },
        angle: 0
    }
    this.angle = this.logicalMapCanvas.getAngleByTwoTerrainPoints(this.leftPoint, this.rightPoint)

    this.isMoving = false
    this.keydownTimer = null
    this.movingTimer = null
    this.isFallingDown = false
    this.fallStartPoint = {
        x: -1,
        y: -1
    }
    this.fallTargetPoint = {
        x: -1,
        y: -1
    }
    this.fallDuration = -1
    this.onFallingAnimOver = null

    this.health = healthMax
    this.healthMax = healthMax

    this.weapon = weapon
    this.weaponAngle = 0

    this.firingPosition = {
        x: -1,
        y: -1
    }
    this.firingPower = 0

    this.numberOfFires = 1
    this.bombsData = []
    this.firingTime = 0

    this.isOperationDone = false

    this.isTrident = false
    this.tridentBombs = []
    this.isPaperPlane = false

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

  // 假设在 battlefield 中只有 2 个 player 
  drawPlayer() {
    // console.log('drawPlayer', this.id, this.centerPoint.x, this.centerPoint.y)
    if(this.msgHandler.isActivePlayer(this.id)) {
        console.log('drawPlayer active')

      this.drawPlayerByIsActive(this.activeCanvas)
    //   this.viewport.setLayerTranslate('active')
    }
    else {
        console.log('drawPlayer inactive')
        this.drawPlayerByIsActive(this.inactiveCanvas)
    //   this.viewport.setLayerTranslate('inactive')
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

    // if(this.direction === 'right') {
    //     canvas.ctx.rotate(-angleToRadian(this.angle))
    // }
    // else if(this.direction === 'left') {
    //     canvas.ctx.rotate(angleToRadian(this.angle))
    // }
    
    // this.drawPlayerDirectionIndicator(canvas)
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

//   playerMoves(direction: Direction) {
//       // this.logPlayerInfo()

//       if(this.direction !== direction) {
//         this.direction = direction
//           // todo
//           // 如果方向改变了，则只调整角度，不移动...


//       }

//       if(direction === 'right' || direction === 'left') {
//           if(this.isPlayerBlocked()) {
//               return
//           }

//           if(this.willPlayerFall()) {
//               console.log('fall!')

//               this.playerFall()

//               return
//           }

//           if(direction === 'right') {
//             this.calculateAndDrawPlayerByPoint(this.rightPoint)
//           }
//           else {
//             this.calculateAndDrawPlayerByPoint(this.leftPoint)
//           }
//       }
//   }

  updatePlayerPositionDataByPreCalculatedPositionData() {
    const {
        standPoint,
        leftEndPoint,
        rightEndPoint,
        angle
    } = this.preCalculatedPositionData
    this.centerPoint.x = standPoint.x
    this.centerPoint.y = standPoint.y
    this.leftPoint = leftEndPoint
    this.rightPoint = rightEndPoint
    this.angle = angle
  }

  playerSmoothlyMovesAnim(timestamp: number) {
    if(!this.isMoving) {
        return
    }

    // 根据 player.direction，从当前A -> B
    if(!this.movingTimer) {
        this.movingTimer = timestamp
    }

    const progress = Math.min((timestamp - this.movingTimer) / PLAYER_MOVING_DURATION, 1)

    // 
    const xA = this.movingStartPoint.x
    const yA = this.movingStartPoint.y
    const xB = this.direction === 'right' ? this.rightPoint.x : this.leftPoint.x
    const yB = this.direction === 'right' ? this.rightPoint.y : this.leftPoint.y
    const x = xA + (xB - xA) * progress
    const y = yA + (yB - yA) * progress
    this.centerPoint.x = Math.floor(x)
    this.centerPoint.y = Math.floor(y)

    this.viewport.focusViewportOnTarget(this.centerPoint, 'playerMove')

    if(progress === 1) {
        // console.log('arrived at B')
        this.msgHandler.onActivePlayerMoving()

        // replace A with B
        this.updatePlayerPositionDataByPreCalculatedPositionData()

        console.log('x, y', this.centerPoint.x, this.centerPoint.y)

        this.drawPlayer()
        this.updatePlayerPositionDataOnPage()

        // B -> C
        this.playerSmoothlyMoves()
        return
    }
    this.drawPlayer()
    requestAnimationFrame(this.playerSmoothlyMovesAnim.bind(this))
  }

  updatePlayerPositionDataOnPage() {
    this.msgHandler.setActivePlayerAngle(this.angle)
  }

  playerSmoothlyMoves() {
    // 判断 block 
    if(this.isPlayerBlocked()) {
        console.log('block!')
        this.isMoving = false
        return
    }

    // 判断 fall 
    if(this.willPlayerFallDown()) {
        console.log('fall!')
        this.msgHandler.onPlayerFall()
        return
    }

    // move init
    this.movingTimer = null
    this.movingStartPoint = {
        x: this.centerPoint.x,
        y: this.centerPoint.y,
    }

    // A -> B anim
    requestAnimationFrame(this.playerSmoothlyMovesAnim.bind(this))

    // precalculate position data at B
    const targetPoint = this.direction === 'right' ? this.rightPoint : this.leftPoint
    const {
        leftPoint, standPoint, rightPoint, angle
    } = this.calculatePlayerPositionDataByPoint(targetPoint)
    // points
    this.preCalculatedPositionData.leftEndPoint = leftPoint
    this.preCalculatedPositionData.standPoint = standPoint
    this.preCalculatedPositionData.rightEndPoint = rightPoint
    // angle
    this.preCalculatedPositionData.angle =angle
  }

  handlePlayerMove(direction: Direction) {
    // player改变了朝向
    if(this.direction !== direction) {
        this.direction = direction

        // 开始计时器 100ms后move
        if(this.keydownTimer) {
            clearTimeout(this.keydownTimer)
        }
        this.keydownTimer = setTimeout(()=>{
            // 如果100ms内 keyup了 则不移动
            if(!this.isMoving) {
                return
            }
            // 否则 更新player位置信息 并 移动
            this.angle = this.getPlayerAngleByTwoTerrainPoints(this.leftPoint, this.rightPoint)
            this.drawPlayer()
            this.updatePlayerPositionDataOnPage()
        
            this.playerSmoothlyMoves()
        }, 100)
    }
    // player未改变朝向
    else {
        this.playerSmoothlyMoves() 
    }
  }

  handlePlayerMoveEnd(centerPoint: Point, direction: Direction) {
    if(this.isFallingDown) return
    this.isMoving = false
    this.centerPoint = centerPoint
    this.direction = direction

    console.log('PlayerMoveEnd', centerPoint.x, centerPoint.y, direction)

    this.viewport.focusViewportOnTarget(this.centerPoint, 'playerMove')

    // 更新player position data
    this.updatePlayerPositionData()
    this.drawPlayer()
  }

  calculateAndDrawPlayerByPoint(point: Point) {
      const locationData = this.calculateLocationDataByCenterPoint(point)
      if(locationData) {
          this.updateLocationData(locationData)
          this.drawPlayer()
          this.updatePlayerPositionDataOnPage()
      }
      else {
        throw new Error("locationData is null");
      }
  }

  calculateLocationDataByCenterPoint(point: Point) {
      const surfacePoints = this.logicalMapCanvas.getSurfacePointsByPointAndLength(point, Player.BOUNDING_BOX_LENGTH)
      const leftPoint = surfacePoints[0]
      const rightPoint = surfacePoints[surfacePoints.length - 1]
      
      if(leftPoint.x === rightPoint.x) {
          console.info('calculatePlayerData 左右两点的x相同!')
          return null
      }
      const angle = this.logicalMapCanvas.getAngleByTwoTerrainPoints(leftPoint, rightPoint)
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
    const standPoint = {
        x: this.centerPoint.x,
        y: this.centerPoint.y
    }

    if(this.direction === 'right') {
        // 如果 right point 和 stand point 的角度 > 65
         return this.getPlayerAngleByTwoTerrainPoints(this.rightPoint, standPoint) > 65
    }
    else {
        return this.getPlayerAngleByTwoTerrainPoints(this.leftPoint, standPoint) > 65
    }
  }
  

  willPlayerFallDown() {
    const standPoint = {
        x: this.centerPoint.x,
        y: this.centerPoint.y
    }
    let d = null

    if(this.direction === 'right') {
        // 如果 right point 和 stand point 的距离 <= 5px
        d = getDistanceBetweenTwoPoints(standPoint, this.rightPoint)
    }
    else {
        d = getDistanceBetweenTwoPoints(standPoint, this.leftPoint)
    }
    return d <= 5
  }

  playerFall(centerPoint: Point, isPaperPlane: boolean = false) {
    this.centerPoint = centerPoint
    let inc = 0
    if(!isPaperPlane) {
        inc = this.direction === 'right' ? 5 : -5
    }
    const newPlayerX = this.centerPoint.x + inc
    const { data } = this.logicalMapCanvas.ctx.getImageData(newPlayerX, this.centerPoint.y, 1, this.logicalMapCanvas.el.height - this.centerPoint.y)
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

            // fall init
            this.isFallingDown = true
            this.movingTimer = null
            this.fallStartPoint = {
                x: newPlayerX,
                y: this.centerPoint.y,
            }
            this.fallTargetPoint = {
                x,
                y
            }
            // 下落速度 1000ms = 1s = 100px
            this.fallDuration = (this.fallTargetPoint.y - this.fallStartPoint.y) * 10

            // fall anim 落到点x，y
            requestAnimationFrame(this.playerFallAnim.bind(this))    
            return
        }
    }

    console.info('player掉进地图外了！')
    // TODO
  }

  playerFallAnim(timestamp: number) {
    if(!this.movingTimer) {
        this.movingTimer = timestamp
    }

    const progress = Math.min((timestamp - this.movingTimer!) / this.fallDuration, 1)

    const xA = this.fallStartPoint.x
    const yA = this.fallStartPoint.y
    const xB = this.fallTargetPoint.x
    const yB = this.fallTargetPoint.y
    const x = xA + (xB - xA) * progress
    const y = yA + (yB - yA) * progress
    this.centerPoint.x = Math.floor(x)
    this.centerPoint.y = Math.floor(y)

    this.viewport.focusViewportOnTarget(this.centerPoint, 'playerMove')
    this.drawPlayer()

    if(progress === 1) {
        this.isFallingDown = false
        this.isMoving = false
        this.updatePlayerPositionData()
        if(this.onFallingAnimOver) {
            this.onFallingAnimOver()
        }

        return
    }
    requestAnimationFrame(this.playerFallAnim.bind(this))
  }

  getPlayerAngleByTwoTerrainPoints(pointA: Point, pointB: Point) {
    const angle = this.logicalMapCanvas.getAngleByTwoTerrainPoints(pointA, pointB)
    return this.direction === 'right' ? angle : -angle
  }

  calculatePlayerPositionDataByPoint(point: Point) {
    const surfacePoints = this.logicalMapCanvas.getSurfacePointsByPointAndLength(point, Player.BOUNDING_BOX_LENGTH)
    const leftPoint = surfacePoints[0]
    const rightPoint = surfacePoints[surfacePoints.length - 1]
    const standPoint = {
        ...point
    }
    const angle = this.getPlayerAngleByTwoTerrainPoints(leftPoint, rightPoint)
    return {
        leftPoint, standPoint, rightPoint, angle
    }
  }

  updatePlayerPositionData() {
    const {
        leftPoint, 
        rightPoint, 
        angle
    } = this.calculatePlayerPositionDataByPoint({
        x: this.centerPoint.x,
        y: this.centerPoint.y,
    })

    this.leftPoint = leftPoint
    this.rightPoint = rightPoint
    this.angle = angle

    this.updatePlayerPositionDataOnPage()
  }

  updatePlayerInfoInBattlefield(centerPoint: Point, direction: Direction, health: number) {
    this.direction = direction
    this.centerPoint = centerPoint
    this.health = health

    const {
        leftPoint, 
        rightPoint, 
        angle
    } = this.calculatePlayerPositionDataByPoint({
        x: this.centerPoint.x,
        y: this.centerPoint.y,
    })

    this.leftPoint = leftPoint
    this.rightPoint = rightPoint
    this.angle = angle
  }

  // --------
  playerStartToFire() {
    // console.time('preCalculateBombData')
    // preCalculateBombData 耗时好像也不是很长，所以暂时不需要用web worker吧
    this.preCalculateBombData()
    // console.timeEnd('preCalculateBombData')
  }

  checkPlayerNumberOfFires(isTrident?: boolean) {
    // 发射后，隔一段时间后再发射
    if(this.numberOfFires > 0) {
        const timerId = setTimeout(()=>{
            clearTimeout(timerId)
            if(isTrident) {
                this.playerStartToFireTrident()
            }
            else {
                this.playerStartToFire()
            }
        }, BOMB_FIRING_INTERVAL)
    }
  }

  playerFires() {
    // lock
    if(this.msgHandler.getIsDrawingBomb()) return
    this.msgHandler.setIsDrawingBomb(true)

    this.drawBomb()
  }

  getBombTarget(bomb: Bomb) {
    const { data: canvasData } = this.bombDrawingOffscreenCanvas.ctx.getImageData(0, 0, this.bombDrawingOffscreenCanvas.logicalWidth, this.bombDrawingOffscreenCanvas.logicalHeight)
    // let count = 0
    for(let i = 0; i < bomb.track.length; i++) {
            const {
                x, y, sec, bombAngle
            } = bomb.track[i]

            // 如果track上的该点 在map范围外
            if(pointOutOfMap(bomb.track[i], this.bombDrawingOffscreenCanvas.logicalWidth, this.bombDrawingOffscreenCanvas.logicalHeight)) {
                break
            }
            
            for(let row = 0; row < bomb.size; row++) {
                const py = y - bomb.size / 2 + row

                if(py < 0) {
                    continue
                }

                for(let col = 0; col < bomb.size; col++) {
                    // count++

                    const px = x - bomb.size / 2 + col
                    if(px < 0 || px >= this.bombDrawingOffscreenCanvas.logicalWidth) {
                        continue
                    }

                    const index = (py * this.bombDrawingOffscreenCanvas.logicalWidth + px) * 4

                    const r = canvasData[index]
                    const g = canvasData[index + 1]
                    const b = canvasData[index + 2]
                    // const a = canvasData[index + 3]
                    // console.log('x, y', x, y, 'r, g, b, a', r, g, b, a)
            
                    if(!(r === 0 && g === 0 && b === 0)) {
                        bomb.targetX = x
                        bomb.targetY = y
                        bomb.bombSec = sec

                        if(!this.isPaperPlane) {
                            // 在离屏canvas上 bombTarget 
                            // console.log('在离屏canvas上 bombTarget')
                            bombTarget({
                                bombId: bomb.id,
                                x,
                                y,
                                damageRadius: bomb.damageRadius,
                                bombAngle: bombAngle
                            }, this.logicalMapCanvas, this.bombDrawingOffscreenCanvas.ctx)
                        }

                        // this.testCanvas.ctx.clearRect(0, 0, this.testCanvas.el.width, this.testCanvas.el.height)
                        // this.testCanvas.ctx.drawImage(this.bombDrawingOffscreenCanvas.el, 0, 0)
                        // this.testCanvas.drawTrack(bomb.track)

                        // console.log('count', count)

                        return true
                    }
                }
            }
    }

    // 如果 bomb越界了
    if(bomb.bombSec === -1) {
        console.log('out of map boundary:', bomb.id)
        
        const {
            x, y, sec
        } = bomb.track[bomb.track.length - 1]
        bomb.targetX = x
        bomb.targetY = y
        // 指定 bombSec为 track上的最后一个点的 sec
        bomb.bombSec = sec
        bomb.isOutOfMapBoundary = true
    }
    // console.log('count', count)

    return false
  }

  preCalculateBombData() {
    console.log('preCalculateBombData')

    // --- init bomb
    const firingAngle = this.angle + this.weaponAngle
    const angle = this.direction === 'right' ? firingAngle : 180 - firingAngle
    const power = this.firingPower

    const v0 = power * 10
    // console.log('v0', v0)
    const v0Horizontal = v0 * Math.cos(angleToRadian(angle))
    // console.log('v0Horizontal', v0Horizontal)

    // 垂直方向
    const v0Vertical = v0 * Math.sin(angleToRadian(angle))

    const bomb: Bomb = {
        id: uuidv4(),
        // 固定fire的位置
        x: this.firingPosition.x,
        y: this.firingPosition.y,
        v0Horizontal,
        v0Vertical,
        size: 2,
        damageRadius: 50,
        track: [],
        bombSec: -1,
        isOutOfMapBoundary: false,
        targetX: -1,
        targetY: -1,
        firingTime: -1
    }

    this.bombsData.push(bomb)

    // ---
    let sec = 0
    const _bomb = {
        ...bomb
    }

    const track = []
    track.push({
        x: _bomb.x,
        y: _bomb.y,
        sec,
        bombAngle: this.direction === 'right' ? -angle : 180 + -angle
    })
    while(!pointOutOfMap(_bomb, this.logicalMapCanvas.el.width, this.logicalMapCanvas.el.height)) {
        // console.log('preCalculate')
        sec += 0.001
        sec = +sec.toFixed(3)

        // 固定fire的位置
        const x = this.firingPosition.x + _bomb.v0Horizontal * sec
        const y = toCartesianCoordinateY(this.firingPosition.y - Player.BOUNDING_BOX_LENGTH, this.logicalMapCanvas.el.height) + _bomb.v0Vertical * sec + 1 / 2 * G * sec * sec
        _bomb.x = Math.floor(x)
        _bomb.y = Math.floor(toCanvasCoordinateY(y, this.logicalMapCanvas.el.height))
        
        const vx = _bomb.v0Horizontal
        const vy = _bomb.v0Vertical + G * sec

        const angle = radianToAngle(Math.atan(vy / vx))

        track.push({
            x: _bomb.x,
            y: _bomb.y,
            sec,
            bombAngle: this.direction === 'right' ? -angle : 180 + -angle
        })
    }

    // console.log('pointOutOfMap! sec:', sec)
    // console.log('track', track)

    // this.logicalMapCanvas.drawTrack(track)

    bomb.track = track

    bomb.isOutOfMapBoundary = !this.getBombTarget(bomb)

    this.msgHandler.syncBombDataBeforePlayerFires(this.bombsData)
  } 

  handleFiringOver() {
    console.log('firing over')

    // 注意：有的逻辑 在所有clients上 都要执行，而有的逻辑（比如 start下一轮）只需要执行一次
    this.msgHandler.setIsDrawingBomb(false)
    this.msgHandler.resetActivePlayerFiringPower()
    this.msgHandler.startNextTurn() 
  }

  drawBomb() {
    if(this.bombsData.length === 0 && this.numberOfFires === 0) {
        this.handleFiringOver()
        
        return
    }

    this.bombCanvas.ctx.clearRect(0, 0, this.bombCanvas.el.width, this.bombCanvas.el.height)

    const now = +new Date()

    for(let i = 0; i < this.bombsData.length; i++) {
        const bomb = this.bombsData[i]

        if(bomb.firingTime === -1) {
            // 待绘制的 bomb
            bomb.firingTime = now
        }
        // 从该bomb发射 经过的时间
        const elapsedMs = now - bomb.firingTime

        // console.log(`bomb${i + 1} elapsedMs ${elapsedMs}`)

        if(elapsedMs >= bomb.bombSec * 1000) {
            // 可能是 有效的bomb，也可能是 越界的bomb

            // 该bomb不应该再被渲染到画布上了
            this.bombsData = this.bombsData.filter(item => item !== bomb)
            this.bombCanvas.ctx.clearRect(0, 0, this.bombCanvas.el.width, this.bombCanvas.el.height)

            // console.log(`elapsedMs: ${elapsedMs} bombSec: ${bomb.bombSec}`) 
            
            // 如果 bomb是有效的
            if(!bomb.isOutOfMapBoundary) {
                const bombMs = bomb.bombSec * 1000
                // console.log('bombMs', bombMs)

                if(this.isPaperPlane) {
                    // 在bombTarget之前(-5)的位置 进行 fallDown
                    const target = {
                        x: bomb.track[bombMs - 5].x,
                        y: bomb.track[bombMs - 5].y
                    }
                    // this.bombCanvas.ctx.fillRect(target.x, target.y, 1, 1)

                    this.onFallingAnimOver = () => {
                        this.handleFiringOver()
                        this.onFallingAnimOver = null
                    }
                    // activePlayer fall down
                    this.playerFall(target, true)

                    return
                }
                else {
                    const target = {
                        bombId: bomb.id,
                        x: bomb.targetX,
                        y: bomb.targetY,
                        damageRadius: bomb.damageRadius,
                        bombAngle: bomb.track[bombMs].bombAngle
                    }

                    bombTarget(target, this.logicalMapCanvas, this.logicalMapCanvas.ctx)
                    bombTarget(target, this.logicalMapCanvas, this.mapCanvas.ctx)
                    bombImpact(target, this.bombImpactCanvas, this.mapCanvas)
                    // 更新 miniMap
                    this.miniMap.drawFrom(this.mapCanvas)
    
                    this.msgHandler.addExplosionParticleEffect(target)
                    this.msgHandler.startExplosionParticleEffect()
    
                    // bomb 对 players的effect
                    this.msgHandler.checkBombEffects(target)
                }
            }

            continue
        }

        // --- render bomb
        const {
            x,
            y,
            bombAngle
        } = bomb.track[elapsedMs]

        // 1.
        // this.bombCanvas.ctx.beginPath()
        // this.bombCanvas.ctx.arc(bomb.x, bomb.y, 1, 0, Math.PI * 2)
        // this.bombCanvas.ctx.stroke()
        // 2.bomb使用图片 且角度动态改变
        this.bombCanvas.ctx.save()

        this.bombCanvas.ctx.translate(x, y)
        this.bombCanvas.ctx.rotate(angleToRadian(bombAngle!))
        this.bombCanvas.ctx.drawImage(this.weapon.bombImage, 0, 0, this.weapon.bombImage.width, this.weapon.bombImage.height, -this.weapon.bombImage.width / 2, -this.weapon.bombImage.height / 2, this.weapon.bombImage.width, this.weapon.bombImage.height)

        this.bombCanvas.ctx.restore()

        // viewport要跟随 最新发射出去的那个bomb
        if(i === this.bombsData.length - 1) {
            // console.log('bombId', bomb.id)
            this.viewport.focusViewportOnTarget({
                x,
                y
            })
        }

        // 计算在笛卡尔坐标系下的 x 和 y
        // const x = players[activePlayerIndex].x + players[activePlayerIndex].bomb.v0Horizontal * elapsedSec
        // bomb从 player中心上方 PLAYER_BOUNDING_BOX_LENGTH 处发射
        // const y = toCanvasCoordinateY(toCartesianCoordinateY(players[activePlayerIndex].y - PLAYER_BOUNDING_BOX_LENGTH) + players[activePlayerIndex].bomb.v0Vertical * elapsedSec + 1 / 2 * G * elapsedSec * elapsedSec)
        // 最终要绘制的bomb的坐标 需要用canvas的坐标系
        // players[activePlayerIndex].bomb.x = Math.floor(x)
        // players[activePlayerIndex].bomb.y = Math.floor(y)

        // bomb.x = x
        // bomb.y = y
    }

    requestAnimationFrame(this.drawBomb.bind(this))
  }

  playerStartToFireTrident() {
    this.preCalculateTridentData()
  }

  playerFiresTrident() {
    // lock
    if(this.msgHandler.getIsDrawingBomb()) return
    this.msgHandler.setIsDrawingBomb(true)

    this.drawTrident()
  }

  preCalculateTridentData() {
    const preCalculateData = (bomb: Bomb) => {
        const { data: canvasData } = this.bombDrawingOffscreenCanvas.ctx.getImageData(0, 0, this.bombDrawingOffscreenCanvas.el.width, this.bombDrawingOffscreenCanvas.el.height)

        let sec = 0
        const _bomb = {
            ...bomb
        }

        // --- calculate track
        const track = []
        track.push({
            x: _bomb.x,
            y: _bomb.y,
            sec,
            bombAngle: this.direction === 'right' ? -angle : 180 + -angle
        })
        while(!pointOutOfMap(_bomb, this.logicalMapCanvas.el.width, this.logicalMapCanvas.el.height)) {
            // console.log('preCalculate')
            sec += 0.001
            sec = +sec.toFixed(3)

            const x = this.centerPoint.x + _bomb.v0Horizontal * sec
            const y = toCartesianCoordinateY(this.centerPoint.y - Player.BOUNDING_BOX_LENGTH, this.logicalMapCanvas.el.height) + _bomb.v0Vertical * sec + 1 / 2 * G * sec * sec
            _bomb.x = Math.floor(x)
            _bomb.y = Math.floor(toCanvasCoordinateY(y, this.logicalMapCanvas.el.height))

            const vx = _bomb.v0Horizontal
            const vy = _bomb.v0Vertical + G * sec

            const angle = radianToAngle(Math.atan(vy / vx))

            track.push({
                x: _bomb.x,
                y: _bomb.y,
                sec,
                bombAngle: this.direction === 'right' ? -angle : 180 + -angle
            })
        }

        // console.log('pointOutOfMap! sec:', sec)
        // console.log('track', track)

        // drawTrack(track)

        bomb.track = track

        // --- getTarget
        for(let i = 0; i < bomb.track.length; i++) {
            // --- target
            if(bomb.bombSec === -1) {
                const {
                    x, y, sec, bombAngle
                } = bomb.track[i]

                // 如果track上的该点 在map范围外
                if(x < 0 || y < 0 || x >= this.bombDrawingOffscreenCanvas.el.width || y >= this.bombDrawingOffscreenCanvas.el.height) {
                    continue
                }

                // x y 像素的数据
                const index = (y * this.bombDrawingOffscreenCanvas.el.width + x) * 4
                const r = canvasData[index]
                const g = canvasData[index + 1]
                const b = canvasData[index + 2]
                // const a = canvasData[index + 3]
                // console.log('x, y', x, y, 'r, g, b, a', r, g, b, a)
        
                if(!(r === 0 && g === 0 && b === 0)) {
                    bomb.targetX = x
                    bomb.targetY = y
                    bomb.bombSec = sec
        
                    // 在离屏canvas上 bombTarget 
                    bombTarget({
                        bombId: bomb.id,
                        x,
                        y,
                        damageRadius: bomb.damageRadius,
                        bombAngle
                    }, this.logicalMapCanvas, this.bombDrawingOffscreenCanvas.ctx)

                }
            }
        }

        if(bomb.bombSec === -1) {
            console.log('out of map boundary:', bomb.id)
            const {
                x, y
            } = bomb.track[bomb.track.length - 1]
            bomb.targetX = x
            bomb.targetY = y
            bomb.bombSec = sec
            bomb.isOutOfMapBoundary = true
        }

        console.log('bomb', bomb)

    }

    // --- init bombs
    const firingAngle = this.angle + this.weaponAngle
    const angle = this.direction === 'right' ? firingAngle : 180 - firingAngle
    const power = this.firingPower
    const v0 = power * 10

    for(let i = 0; i < 3; i++) {
        let newAngle = angle
        if(i === 0) {
            newAngle -= TRIDENT_ANGLE_DIFFERENCE
        }
        else if(i === 2) {
            newAngle += TRIDENT_ANGLE_DIFFERENCE
        }

        const bomb: Bomb = {
            // TODO 别用时间戳
            id: `${+new Date()}_${i}`,
            // bomb从 player中心上方 PLAYER_BOUNDING_BOX_LENGTH 处发射
            x: this.centerPoint.x,
            y: this.centerPoint.y - Player.BOUNDING_BOX_LENGTH,
    
            v0Horizontal: v0 * Math.cos(angleToRadian(newAngle)),
            v0Vertical: v0 * Math.sin(angleToRadian(newAngle)),
            
            size: 1,
            damageRadius: 50,
            track: [],

            targetX: -1,
            targetY: -1,
            bombSec: -1,
            isOutOfMapBoundary: false,
            firingTime: -1,
        }
    
        this.tridentBombs.push(bomb)

        // --- preCalculate one by one
        preCalculateData(bomb)
    }

    console.log('start to sync')

    this.msgHandler.syncBombDataBeforePlayerFires(this.tridentBombs, true)
  }

  drawTrident() {
    if(this.tridentBombs.length === 0 && this.numberOfFires === 0) {
        // 全部bombed
        console.log('全部bombed')

        this.msgHandler.setIsDrawingBomb(false)

        // 重置 this.firingPower
        this.msgHandler.resetActivePlayerFiringPower()

        this.msgHandler.startNextTurn()
        return
    }

    requestAnimationFrame(this.drawTrident.bind(this))

    this.bombCanvas.ctx.clearRect(0, 0, this.bombCanvas.el.width, this.bombCanvas.el.height)
    
    const now = +new Date()

    for(let i = 0; i < this.tridentBombs.length; i++) {
        const bomb = this.tridentBombs[i]

        if(bomb.firingTime === -1) {
            bomb.firingTime = now
        }

        // 从该bomb发射 经过的时间
        const elapsedMs = now - bomb.firingTime

        // 如果bomb到达了target
        if(elapsedMs >= bomb.bombSec * 1000) {
            this.tridentBombs = this.tridentBombs.filter(item => item !== bomb)
    
            if(!bomb.isOutOfMapBoundary) {
                const bombMs = bomb.bombSec * 1000

                const target = {
                    bombId: bomb.id,
                    x: bomb.x,
                    y: bomb.y,
                    damageRadius: bomb.damageRadius,
                    bombAngle: bomb.track[bombMs].bombAngle
                }
                bombTarget(target, this.logicalMapCanvas, this.logicalMapCanvas.ctx)
                // this.msgHandler.syncWithLogicalMapCanvas()

                // 对player的effect
                this.msgHandler.checkBombEffects(target)
            }

            continue
        }

        // --- render bomb
        const {
            x,
            y,
            bombAngle
        } = bomb.track[elapsedMs]

        // 1.
        // this.bombCanvas.ctx.beginPath()
        // this.bombCanvas.ctx.arc(bomb.x, bomb.y, 1, 0, Math.PI * 2)
        // this.bombCanvas.ctx.stroke()

        // 2.bomb使用图片 且角度动态改变
        this.bombCanvas.ctx.save()

        this.bombCanvas.ctx.translate(bomb.x, bomb.y)
        this.bombCanvas.ctx.rotate(angleToRadian(bombAngle!))
        this.bombCanvas.ctx.drawImage(this.weapon.bombImage, 0, 0, this.weapon.bombImage.width, this.weapon.bombImage.height, -this.weapon.bombImage.width / 2, -this.weapon.bombImage.height / 2, this.weapon.bombImage.width, this.weapon.bombImage.height)

        this.bombCanvas.ctx.restore()

        // 计算在笛卡尔坐标系下的 x 和 y
        // const x = this.centerPoint.x + bomb.v0Horizontal * elapsedSec
        // bomb从 player中心上方 PLAYER_BOUNDING_BOX_LENGTH 处发射
        // const y = toCanvasCoordinateY(toCartesianCoordinateY(this.centerPoint.y - Player.BOUNDING_BOX_LENGTH, this.logicalMapCanvas.el.height) + bomb.v0Vertical * elapsedSec + 1 / 2 * G * elapsedSec * elapsedSec, this.logicalMapCanvas.el.height)
        // 最终要绘制的bomb的坐标 需要用canvas的坐标系
        // bomb.x = Math.floor(x)
        // bomb.y = Math.floor(y)

        bomb.x = x
        bomb.y = y
    }
  }
}

export function bombTarget({x, y, damageRadius}: BombTarget, logicalCanvas: LogicalCanvas, targetCtx: CanvasRenderingContext2D) {
    const offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = logicalCanvas.logicalWidth
    offscreenCanvas.height = logicalCanvas.logicalHeight
    const offscreenCanvasCtx = offscreenCanvas.getContext('2d')!
    offscreenCanvasCtx.lineWidth = LogicalCanvas.LINE_WIDTH

    // 先fill => 再stroke(destination-out) -> 得到 【内部填充】
    offscreenCanvasCtx.beginPath()
    offscreenCanvasCtx.arc(x, y, damageRadius, 0, Math.PI * 2)
    // offscreenCanvasCtx.save()
    
    // offscreenCanvasCtx.translate(x - damageRadius, y - damageRadius)
    // setCtxPathByMap(offscreenCanvasCtx, SHELL_CRATER_50_round)
    offscreenCanvasCtx.fill()

    offscreenCanvasCtx.globalCompositeOperation = 'destination-out'
    offscreenCanvasCtx.stroke()

    // offscreenCanvasCtx.restore()

    // 然后将offscreenCanvas 以destination-out的方式，绘制到 mapCanvas上
    targetCtx.save()

    targetCtx.globalCompositeOperation = 'destination-out'
    targetCtx.drawImage(offscreenCanvas, 0, 0)

    // 最后绘制描边
    targetCtx.beginPath()
    targetCtx.arc(x, y, damageRadius, 0, Math.PI * 2)
    targetCtx.globalCompositeOperation = 'source-atop'

    // targetCtx.translate(x - damageRadius, y - damageRadius)
    // setCtxPathByMap(targetCtx, SHELL_CRATER_50_round)
    targetCtx.stroke()

    targetCtx.restore()
}

export function bombImpact({x, y, damageRadius}: BombTarget, bombImpactCanvas: ScreenCanvas, mapCanvas: ScreenCanvas) {
    // bombImpactCanvas
    bombImpactCanvas.ctx.beginPath()
    bombImpactCanvas.ctx.arc(x, y, damageRadius, 0, Math.PI * 2)
    bombImpactCanvas.ctx.lineWidth = 10
    bombImpactCanvas.ctx.strokeStyle = '#000'
    bombImpactCanvas.ctx.stroke()

    // 合成到 mapCanvas
    const dpr = bombImpactCanvas.dpr
    const logicalWidth = bombImpactCanvas.logicalWidth
    const logicalHeight = bombImpactCanvas.logicalHeight
    mapCanvas.ctx.save()
    mapCanvas.ctx.globalCompositeOperation = 'source-atop'
    mapCanvas.ctx.drawImage(bombImpactCanvas.el, 0, 0, logicalWidth * dpr, logicalHeight * dpr, 0, 0, logicalWidth, logicalHeight);
    mapCanvas.ctx.restore()
}

export function checkBombEffect(bombTarget: BombTarget, player: Player, socket: Socket) {
    const {
        x,
        y,
        damageRadius
    } = bombTarget

    // 对player的影响
    // 判断爆炸点 和 player中心 的距离 是否 <= damageRadius
    const d = getDistanceBetweenTwoPoints({
        x,
        y
    }, player.centerPoint)
    if(d <= damageRadius) {
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
        
        // draw player at new pos
        const { data } = player.logicalMapCanvas.ctx.getImageData(player.centerPoint.x, player.centerPoint.y, 1, player.logicalMapCanvas.el.height - player.centerPoint.y)
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
        else {
            // 更新 服务器上的 player的 hp, center point，并记录该 bomb
            const {
                id,
                health,
                centerPoint
            } = player

            socket.emit('bombBombedInBattlefield', {
                bombTarget,
                playerInfo: {
                    id,
                    health,
                    centerPoint
                }
            })
        }
    }
    else {
        // 记录该 bomb
        socket.emit('bombBombedInBattlefield', {
            bombTarget,
        })
    }
}