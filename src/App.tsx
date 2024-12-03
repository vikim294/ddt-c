import { useEffect, useRef } from 'react';
import { useState } from 'react'
import { io, Socket } from "socket.io-client";
import "./App.css"
import { Canvas, MapCanvas } from './libs/canvas';
import { MULTIPLE } from './assets/maps';
import { BombTarget, checkBombEffect, Direction, Player, Weapon } from './libs/player';

const CLIENT_PLAYER_ID = `player_${window.devicePixelRatio}`

// interface ClientPlayer {
//   id: string
//   name: string
//   angle: number
//   health: number
//   healthMax: number
// }

interface FiringData {
  activePlayerWeaponAngle: number
  activePlayerFiringPower: number
  activePlayerNumberOfFires: number
  activePlayerIsTrident: boolean
}

export interface MsgHandler {
  getClientPlayerId: () => string
  isActivePlayer: (playerId: string) => boolean
  checkBombEffect: (bombTarget: BombTarget) => void
  resetActivePlayerFiringPower: () => void
  startNextTurn: () => void
}

function App() {
  // const [isFullScreen, setIsFullScreen] = useState(null)
  // const [print, setPrint] = useState('')

  const [isConnected, setIsConnected] = useState(false)
  const [isMatchCompleted, setIsMatchCompleted] = useState(false)
  const [activePlayerId, setActivePlayerId] = useState('')
  const [activePlayerSkills, setActivePlayerSkills] = useState('')

  const mapCanvasRef = useRef(null)
  const mapCanvas = useRef<MapCanvas>()

  const inactiveCanvasRef = useRef(null)
  const inactiveCanvas = useRef<Canvas>()

  const activeCanvasRef = useRef(null)
  const activeCanvas = useRef<Canvas>()
  
  const bombCanvasRef = useRef(null)
  const bombCanvas = useRef<Canvas>()

  const playerRefs = useRef<Player[]>([]) 
  const activePlayer = useRef<Player>()
  const clientPlayer = useRef<Player>()

  const socketRef = useRef<Socket>()
  // ---
  const [clientPlayerId, setClientPlayerId] = useState('')
  const [clientPlayerName, setClientPlayerName] = useState('')
  const [clientPlayerAngle, setClientPlayerAngle] = useState(0)
  const [clientPlayerWeaponAngle, setClientPlayerWeaponAngle] = useState(0)
  const [clientPlayerHealth, setClientPlayerHealth] = useState(0)
  const [clientPlayerHealthMax, setClientPlayerHealthMax] = useState(0)

  const [clientPlayerFiringPower, setClientPlayerFiringPower] = useState(0)

  // useEffect(() => {
  //   if (isFullScreen === true) {
  //     const elem = document.documentElement; // 全屏整个文档

  //     if (elem.requestFullscreen) {
  //       elem.requestFullscreen();
  //     } else if (elem.mozRequestFullScreen) { // Firefox
  //       elem.mozRequestFullScreen();
  //     } else if (elem.webkitRequestFullscreen) { // Chrome, Safari 和 Opera
  //       elem.webkitRequestFullscreen();
  //     } else if (elem.msRequestFullscreen) { // IE/Edge
  //       elem.msRequestFullscreen();
  //     }
  //     else {
  //       alert('不支持 fullScreen')
  //     }
  //   }
  //   else if(isFullScreen === false) {
  //     if (document.exitFullscreen) {
  //       document.exitFullscreen();
  //     } else if (document.mozExitFullScreen) { // FirefoxD
  //       document.mozExitFullScreen();
  //     } else if (document.webkitExitFullscreen) { // Chrome, Safari 和 Opera
  //       document.webkitExitFullscreen();
  //     } else if (document.msExitFullscreen) { // IE/Edge
  //       document.msExitFullscreen();
  //     }
  //     else {
    //       alert('不支持 exit fullScreen')
    //     }
    //   }
    
    // }, [isFullScreen])

  const firingPowerTimer = useRef(0)

  // 

  function isActivePlayer() {
    return clientPlayer.current?.id === activePlayer.current?.id
  }

  function isActivePlayerOperationDone() {
    return activePlayer.current!.isOperationDone
  }

  const msgHandler = useRef({
    getClientPlayerId() {
      return CLIENT_PLAYER_ID
    },

    isActivePlayer(playerId: string) {
      return activePlayer.current?.id === playerId
    },

    checkBombEffect(bombTarget: BombTarget) {
        playerRefs.current.forEach(player => {
          checkBombEffect(bombTarget, player)
        })
    },

    resetActivePlayerFiringPower() {
      if(activePlayer.current) {
        activePlayer.current.firingPower = 0
      }
      if(isActivePlayer()) {
        setClientPlayerFiringPower(0)
      }
    },

    startNextTurn() {
      if(activePlayer.current?.id === CLIENT_PLAYER_ID) {
        setTimeout(()=>{
          activePlayer.current!.isOperationDone = true
          socketRef.current?.emit('startNextTurn')
        }, 2000)
      }
    }
  })

  // 

  function adjustWeaponAngle(direction: "up" | "down") {
    if(!clientPlayer.current) {
      return
    }
    if(direction === 'up') {
        const newWeaponAngle = clientPlayer.current.weaponAngle + 1
        if(newWeaponAngle <= clientPlayer.current.weapon.angleRange) {
            clientPlayer.current.weaponAngle = newWeaponAngle
            setClientPlayerWeaponAngle(newWeaponAngle)
        }
    }
    else {
        const newWeaponAngle = clientPlayer.current.weaponAngle - 1
        if(newWeaponAngle >= 0) {
            clientPlayer.current.weaponAngle = newWeaponAngle
            setClientPlayerWeaponAngle(newWeaponAngle)
        }
    }
  }

  function adjustFiringPower() {
    if(isActivePlayer() && activePlayer.current) {
      let newFiringPower = activePlayer.current.firingPower + 1
      if(newFiringPower > 100) {
        newFiringPower = 0
      }
      activePlayer.current.firingPower = newFiringPower
      setClientPlayerFiringPower(newFiringPower)
    }
  }

  function onKeydown(ev: KeyboardEvent) {
    ev.preventDefault()
    // console.log(ev)

    if(ev.key === 'ArrowRight') {
        // 如果 clientPlayer 现在不是 activePlayer，则返回
        if(!isActivePlayer()) return
        socketRef.current?.emit('activePlayerMove', 'right')
    }
    else if(ev.key === 'ArrowLeft') {
        if(!isActivePlayer()) return
        socketRef.current?.emit('activePlayerMove', 'left')
    }
    else if(ev.key === 'ArrowUp') {
        adjustWeaponAngle('up')
    }
    else if(ev.key === 'ArrowDown') {
        adjustWeaponAngle('down')
    }
    else if(ev.key === ' ') {
        // 蓄力
        if(!isActivePlayer()) return
        if(!isActivePlayerOperationDone()) return
        adjustFiringPower()
    }
  }

  function onKeyup(ev: KeyboardEvent) {
    const isActive = isActivePlayer()

    ev.preventDefault()
    // console.log(ev)

    if(ev.key === ' ') {
        // 如果 clientPlayer 现在不是 activePlayer，则返回
        if(!isActive) return
        if(!isActivePlayerOperationDone()) return
        activePlayer.current!.isOperationDone = false

        // 把fire时，activePlayer的当前相关数据 传给server，
        // 然后server再发给其他player，更新其客户端activePlayer时的数据
        socketRef.current?.emit('activePlayerFire', {
          activePlayerWeaponAngle: activePlayer.current!.weaponAngle,
          activePlayerFiringPower: activePlayer.current!.firingPower,
          activePlayerNumberOfFires: activePlayer.current!.numberOfFires,
          activePlayerIsTrident: activePlayer.current!.isTrident
        })
    }
  }

  function onContextmenu(ev: MouseEvent) {
    ev.preventDefault()
  }

  // isConnected
  useEffect(()=>{
    document.addEventListener('contextmenu', onContextmenu)

    if(isConnected) {
      // console.log('useEffect isConnected')
      // 已连接
      document.body.addEventListener('keydown', onKeydown)
      document.body.addEventListener('keyup', onKeyup)
    }

    return ()=>{
      document.body.removeEventListener('keydown', onKeydown)
      document.body.removeEventListener('keyup', onKeyup)
      document.removeEventListener('contextmenu', onContextmenu)
    }
  },[isConnected])

  // connect
  const connect = () => {
    // socketRef.current = io("http://172.20.10.3:3000", {
    socketRef.current = io("http://192.168.1.104:3000", {
      auth: {
        token: CLIENT_PLAYER_ID
      }
    })

    socketRef.current.on('connect', ()=>{
      setIsConnected(true)
    })

    socketRef.current.on('matchCompleted', (data: {
      activePlayerId: string
      players: {
        id: string
        name: string
        centerPoint: {
          x: number
          y: number
        }
        direction: Direction

        healthMax: number

        weapon: Weapon
      }[]
    }) => {
      // 匹配完成 初始化
      console.log('matchCompleted data:', data)
      setIsMatchCompleted(true)

      if(!mapCanvasRef.current ||
         !inactiveCanvasRef.current ||
         !activeCanvasRef.current ||
         !bombCanvasRef.current
      ) {
        return
      }
      mapCanvas.current = new MapCanvas({
        el: mapCanvasRef.current,
        // width: window.innerWidth,
        width: 1920,
        // height: window.innerHeight,
        height: 1080,
        initMap: MULTIPLE
      })

      inactiveCanvas.current = new Canvas({
        el: inactiveCanvasRef.current,
        // width: window.innerWidth,
        width: 1920,
        // height: window.innerHeight,
        height: 1080,
      })

      activeCanvas.current = new Canvas({
        el: activeCanvasRef.current,
        // width: window.innerWidth,
        width: 1920,
        // height: window.innerHeight,
        height: 1080,
      })

      bombCanvas.current = new Canvas({
        el: bombCanvasRef.current,
        // width: window.innerWidth,
        width: 1920,
        // height: window.innerHeight,
        height: 1080,
      })

      const {
        activePlayerId,
        players
      } = data

      setActivePlayerId(activePlayerId)

      players.forEach(item => {
        const {
          id,
          name,
          direction,
          centerPoint,

          healthMax,

          weapon
        } = item

        const player = new Player({
          msgHandler: msgHandler.current,

          mapCanvas: mapCanvas.current!,
          inactiveCanvas: inactiveCanvas.current!,
          activeCanvas: activeCanvas.current!,
          bombCanvas: bombCanvas.current!,

          id,
          name,
          direction,
          centerPoint,

          healthMax,

          weapon,
        })

        // 保存多个player实例
        playerRefs.current.push(player)

        if(player.id === activePlayerId) {
          // set activePlayer
          activePlayer.current = player
        }
        
        if(player.id === CLIENT_PLAYER_ID) {
          // set clientPlayer
          clientPlayer.current = player

          // 同步状态
          const {
            id,
            name,
            angle,
            health,
            healthMax,

            // weapon,
            weaponAngle
          } = player
          setClientPlayerId(id)
          setClientPlayerName(name)
          setClientPlayerAngle(angle)
          setClientPlayerHealth(health)
          setClientPlayerHealthMax(healthMax)
          // 初始 weaponAngle
          setClientPlayerWeaponAngle(weaponAngle)
        }
        
      })

      playerRefs.current.forEach(player => {
        player.drawPlayer()
      })

    })

    socketRef.current.on('activePlayerMove', (direction: Direction) => {
      if(!activePlayer.current) return
      activePlayer.current.playerMoves(direction)

      // 如果当前clientPlayer 是 activePlayer
      if(clientPlayer.current?.id === activePlayer.current.id) {
        setClientPlayerAngle(activePlayer.current.angle)
      }
    })

    socketRef.current.on('activePlayerFire', (firingData: FiringData) => {
      if(!activePlayer.current) return
      const {
        activePlayerWeaponAngle,
        activePlayerFiringPower,
        activePlayerIsTrident,
        activePlayerNumberOfFires,
      } = firingData
      activePlayer.current.weaponAngle = activePlayerWeaponAngle
      activePlayer.current.firingPower = activePlayerFiringPower
      activePlayer.current.isTrident = activePlayerIsTrident
      activePlayer.current.numberOfFires = activePlayerNumberOfFires

      if(activePlayer.current.isTrident) {
        activePlayer.current.playerStartToFireTrident()
      }
      else {
        activePlayer.current.playerStartToFire()
      }

    })

    socketRef.current.on('startNextTurn', (nextTurnData: {
      activePlayerId: string
    }) => {
      alert(`startNextTurn 轮到 activePlayer: ${nextTurnData.activePlayerId} 出手了`)
      setActivePlayerId(nextTurnData.activePlayerId)
      setActivePlayerSkills('')

      activePlayer.current = playerRefs.current.find(player => player.id === nextTurnData.activePlayerId)
      if(!activePlayer.current) {
        return
      }
      activePlayer.current.numberOfFires = 1
      activePlayer.current.isTrident = false

      // 重绘所有players
      playerRefs.current.forEach(player => {
        player.drawPlayer()
      })
    })  
  }

  // clientPlayerFiringAngle
  const clientPlayerFiringAngle = clientPlayerAngle + clientPlayerWeaponAngle

  console.log('render')

  return (
    <div id='app'>
      <div id="canvas-container">
        <canvas id='map' ref={mapCanvasRef}></canvas>
        <canvas id='inactive' ref={inactiveCanvasRef}></canvas>
        <canvas id='active' ref={activeCanvasRef}></canvas>
        <canvas id='bomb' ref={bombCanvasRef}></canvas>
      </div>

      <div id="ui-container">
        <div className="left">
            <div className='item'>
              isConnected: { isConnected && 'connected!' }
            </div>
            <div className='item'>
              isMatchCompleted: { isMatchCompleted && 'matchCompleted!' }
            </div>
            <div className='item'>
              playerId: { clientPlayerId }
            </div>
            <div className='item'>
              playerName: { clientPlayerName }
            </div>
            <div className='item'>
              health: { clientPlayerHealth } / { clientPlayerHealthMax }
            </div>
            <div className='item'>
              firingAngle: { clientPlayerFiringAngle }
            </div>
            <div className='item'>
              firingPower: { clientPlayerFiringPower }
            </div>
          <div className="item">
            <button onClick={connect}>connect</button>
          </div>
        </div>
        <div className="right">
            <div className='item'>
              activePlayerId: { activePlayerId }
            </div>
            <div className='item'>
              skills: { activePlayerSkills }
            </div>
            <div className='item'>
              <button onClick={() => {
                  if(!isActivePlayer()) return
                  if(!isActivePlayerOperationDone()) return
                  activePlayer.current!.numberOfFires++
                  setActivePlayerSkills(value => value + '+1')
              }}>+1</button>
              <button onClick={() => {
                  if(!isActivePlayer()) return
                  if(!isActivePlayerOperationDone()) return
                  activePlayer.current!.isTrident = true
                  setActivePlayerSkills(value => value + '+III')
              }}>III</button>
            </div>
            <div className='item'>
              <button onClick={() => {
                  adjustWeaponAngle('up')
              }}>↑</button>
              <button onClick={() => {
                  adjustWeaponAngle('down')
              }}>↓</button>
              <button onClick={() => {
                  if(clientPlayer.current?.id !== activePlayer.current?.id) return
                  socketRef.current?.emit('activePlayerMove', 'left')
              }}>←</button>
              <button onClick={() => {
                  if(clientPlayer.current?.id !== activePlayer.current?.id) return
                  socketRef.current?.emit('activePlayerMove', 'right')
              }}>→</button>
            </div>
            <div className='item'>
              <button onTouchStart={() => {
                if(!isActivePlayer()) return
                firingPowerTimer.current = setInterval(adjustFiringPower, 50);
              }} onTouchEnd={() => {
                clearInterval(firingPowerTimer.current)
                if(!isActivePlayer()) return
                if(!isActivePlayerOperationDone()) return
                activePlayer.current!.isOperationDone = false
                
                socketRef.current?.emit('activePlayerFire', {
                  activePlayerWeaponAngle: activePlayer.current!.weaponAngle,
                  activePlayerFiringPower: activePlayer.current!.firingPower,
                  activePlayerNumberOfFires: activePlayer.current!.numberOfFires,
                  activePlayerIsTrident: activePlayer.current!.isTrident
                })
              }}>fire</button>
            </div>
        </div>

        <div>
          {/* <button onClick={() => {
            setPrint(`
              window.innerWidth: ${window.innerWidth},
              window.innerHeight: ${window.innerHeight},
              window.devicePixelRatio: ${window.devicePixelRatio},
            `)
          }}>printWindowInfo</button>
          <div>
            { print }
          </div>   */}
        </div>
        <div>
          {/* <button onClick={() => {
            setIsFullScreen(!isFullScreen)
          }}>fullScreen</button> */}
        </div>
      </div>
    </div>
  )
}

export default App
