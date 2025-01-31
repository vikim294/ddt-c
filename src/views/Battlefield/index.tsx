import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useEffect, useRef } from "react";
import { useState } from "react";
import { io, Socket } from "socket.io-client";
import "./index.scss";
import { ScreenCanvas, LogicalCanvas, Point } from "../../libs/canvas";
import { MULTIPLE, MULTIPLE_SIMPLE, MULTIPLE_SIMPLE2 } from "../../assets/maps";
import {
  Bomb,
  BombTarget,
  checkBombEffect,
  Direction,
  Player,
  Weapon,
} from "../../libs/player";
import { SOCKET_SERVER_URL } from "../../utils/conf";

import bombImage from "../../assets/bomb.png"
import { ExplosionParticleEffect } from "../../libs/particleEffect";
import MiniMap from "./components/MiniMap";
import useMsgHandler from "../../hooks/useMsgHandler";
import { Viewport } from "../../libs/viewport";
import { CAMERA_FOCUS_DURATION } from "../../libs/constants";

export interface ClientPlayer {
  id: string;
  level: number;
}

const client: ClientPlayer = {
  id: `player_${window.navigator.userAgent.length}`,
  level: navigator.userAgent.length,
};

interface PlayerData {
  id: string;
  name: string;
  isOnline: boolean;
  centerPoint: {
    x: number;
    y: number;
  };
  direction: Direction;

  healthMax: number;

  weapon: Weapon;
}

type PlayerSkills = 'oneMore' | 'twoMore'

interface FiringData {
  activePlayerWeaponAngle: number;
  activePlayerFiringPower: number;
  activePlayerNumberOfFires: number;
  activePlayerIsTrident: boolean;
}

const Battlefield: React.FC = () => {
  // const [isFullScreen, setIsFullScreen] = useState(null)
  // const [print, setPrint] = useState('')

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const battlefieldId = searchParams.get("battlefieldId");

  const [isConnected, setIsConnected] = useState(false);
  const [tip, setTip] = useState("");
  const [isNextTurnNotiVisible, setIsNextTurnNotiVisible] = useState(false);
  const nextTurnNotiTimerRef = useRef(0)

  const [isReadyToInit, setIsReadyToInit] = useState(false);
  const [playersData, setPlayersData] = useState<PlayerData[]>([]);
  const [activePlayerId, setActivePlayerId] = useState("");

  const [activePlayerSkills, setActivePlayerSkills] = useState("");
  const [isOperationDone, setIsOperationDone] = useState(false);

  const logicalMapCanvas = useRef<LogicalCanvas>();
  const bombDrawingOffscreenCanvas = useRef<LogicalCanvas>();
  const isDrawingBombRef = useRef(false);

  const mapCanvasRef = useRef(null);
  const mapCanvas = useRef<ScreenCanvas>();

  const bombImpactCanvas = useRef<ScreenCanvas>();

  const inactiveCanvasRef = useRef(null);
  const inactiveCanvas = useRef<ScreenCanvas>();

  const activeCanvasRef = useRef(null);
  const activeCanvas = useRef<ScreenCanvas>();

  const bombCanvasRef = useRef(null);
  const bombCanvas = useRef<ScreenCanvas>();
  
  const explosionParticleCanvasRef = useRef(null);
  const explosionParticleCanvas = useRef<ScreenCanvas>();

  const explosionParticleEffectRef = useRef<ExplosionParticleEffect | null>(null)

  const testCanvasRef = useRef(null);
  const testCanvas = useRef<ScreenCanvas>();

  // 根据 settings 决定 viewport
  const [viewportSize, setViewportSize] = useState({
    width: 800,
    height: 600
  })

  const viewportRef = useRef<Viewport | null>(null)

  const miniMapCanvasRef = useRef(null);
  const miniMapRef = useRef<ScreenCanvas>();
  
  const [miniViewportTranslate, setMiniViewportTranslate] = useState({
      x: 0,
      y: 0
  })

  const miniMapSizeRef = useRef({
    miniMapWidth: 0,
    miniMapHeight: 0,
    miniViewportWidth: 0,
    miniViewportHeight: 0,
  })

  const viewportToMiniViewportRatioRef = useRef<{
    widthRatio: number | null,
    heightRatio: number | null
  }>({
    widthRatio: null,
    heightRatio: null
  })

  const playerRefs = useRef<Player[]>([]);
  const activePlayer = useRef<Player | null>(null);
  const clientPlayer = useRef<Player | null>(null);

  const socketRef = useRef<Socket | null>(null);
  // ---
  const [clientPlayerId, setClientPlayerId] = useState("");
  const [clientPlayerName, setClientPlayerName] = useState("");
  const [clientPlayerAngle, setClientPlayerAngle] = useState(0);
  const [clientPlayerWeaponAngle, setClientPlayerWeaponAngle] = useState(0);
  const [clientPlayerHealth, setClientPlayerHealth] = useState(0);
  const [clientPlayerHealthMax, setClientPlayerHealthMax] = useState(0);

  const [clientPlayerFiringPower, setClientPlayerFiringPower] = useState(0);

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

  const firingPowerTimer = useRef(0);

  //

  function isActivePlayer() {
    return clientPlayer.current?.id === activePlayer.current?.id;
  }

  function isActivePlayerOperationDone() {
    return activePlayer.current!.isOperationDone;
  }

  const setActivePlayerIsOperationDone = (isOperationDone: boolean) => {
    if(!activePlayer.current) return
    activePlayer.current.isOperationDone = isOperationDone;
    if(isActivePlayer()) {
      setIsOperationDone(isOperationDone)
    }
  } 

  // msgHandler
  const msgHandler = useMsgHandler({
    client,
    clientPlayer,
    activePlayer,
    socketRef,
    explosionParticleEffectRef,
    playerRefs,
    isDrawingBombRef,
    isActivePlayer,
    checkBombEffect,
    setClientPlayerAngle,
    setClientPlayerFiringPower
  })

  useEffect(() => {
    function connect() {
      console.log('connect')
      setIsConnected(true);
      setTip("");
      socketRef.current?.emit("joinBattlefield");
    }

    function initBattlefield(data: { activePlayerId: string; players: PlayerData[] }) {
      // 初始化
      console.log("initBattlefield data:", data);

      setIsReadyToInit(true)
      setActivePlayerId(data.activePlayerId);
      setPlayersData(data.players);
    }

    function playerReconnectsBattlefield(data: { reconnectionPlayerId: string, activePlayerId: string; players: PlayerData[] }) {
      const {
        reconnectionPlayerId,
        activePlayerId,
        players,
      } = data;

      console.log(`playerReconnectsBattlefield: ${reconnectionPlayerId}`);
      console.log('playersData', players);
      if (client.id === reconnectionPlayerId) {
        // 如果当前client 是 重连的player
        // 同步最新数据
        console.log("同步最新数据"); 
        setIsReadyToInit(true)
        setActivePlayerId(activePlayerId);
        setPlayersData(players);
      }

      // 更新player的在线状态
      console.log(`更新player ${reconnectionPlayerId} 的在线状态`);

      setPlayersData((prev) => {
        return prev.map((item) => {
          if (item.id === reconnectionPlayerId) {
            item.isOnline = true;
          }
          return item;
        });
      });
    }

    function disconnect(reason: string) {
      console.info(`连接已断开: ${reason}`);
      // alert(`连接已断开: ${reason}`);

      switch (reason) {
        case "io client disconnect": {
          break;
        }
        case "transport close": {
          // 无网络连接
          setTip("无网络连接，请检查网络");
          break;
        }
        default: {
          break;
        }
      }
    }

    // handleConnect
    const handleConnect = () => {
      // socketRef.current = io("http://172.20.10.3:3000", {
      socketRef.current = io(`${SOCKET_SERVER_URL}/battlefield`, {
        auth: {
          token: client.id,
        },
      });

      socketRef.current.on("connect", connect);
      socketRef.current.on("initBattlefield", initBattlefield);
      socketRef.current.on("playerReconnectsBattlefield", playerReconnectsBattlefield);
      socketRef.current.on("disconnect", disconnect);
    };

    // 页面加载完成后，连接服务器
    handleConnect();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current?.off("connect", connect);
      socketRef.current?.off("initBattlefield", initBattlefield);
      socketRef.current?.off("playerReconnectsBattlefield", playerReconnectsBattlefield);
      socketRef.current?.off("disconnect", disconnect);
    };
  }, [battlefieldId]);

  useEffect(() => {
    function adjustWeaponAngle(direction: "up" | "down") {
      if (!clientPlayer.current) {
        return;
      }
      if (direction === "up") {
        const newWeaponAngle = clientPlayer.current.weaponAngle + 1;
        if (newWeaponAngle <= clientPlayer.current.weapon.angleRange) {
          clientPlayer.current.weaponAngle = newWeaponAngle;
          setClientPlayerWeaponAngle(newWeaponAngle);
        }
      } else {
        const newWeaponAngle = clientPlayer.current.weaponAngle - 1;
        if (newWeaponAngle >= 0) {
          clientPlayer.current.weaponAngle = newWeaponAngle;
          setClientPlayerWeaponAngle(newWeaponAngle);
        }
      }
    }

    function adjustFiringPower() {
      if (isActivePlayer() && activePlayer.current) {
        let newFiringPower = activePlayer.current.firingPower + 1;
        if (newFiringPower > 100) {
          newFiringPower = 0;
        }
        activePlayer.current.firingPower = newFiringPower;
        setClientPlayerFiringPower(newFiringPower);
      }
    }

    function handlePlayerMove(direction: Direction) {
      if (activePlayer.current) {
        // --- 上锁
        if (activePlayer.current.isMoving) return;
        activePlayer.current.isMoving = true;
        socketRef.current?.emit("activePlayerMove", direction);
      }
    }

    function onKeydown(ev: KeyboardEvent) {
      // console.log(ev)

      if (ev.key === "ArrowRight") {
        ev.preventDefault();

        // 如果 clientPlayer 现在不是 activePlayer，则返回
        if (!isActivePlayer()) return;
        if (!isActivePlayerOperationDone()) return;

        handlePlayerMove("right");
      } else if (ev.key === "ArrowLeft") {
        ev.preventDefault();

        if (!isActivePlayer()) return;
        if (!isActivePlayerOperationDone()) return;

        handlePlayerMove("left");
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault();

        if (!isActivePlayer()) return;
        if (!isActivePlayerOperationDone()) return;

        adjustWeaponAngle("up");
      } else if (ev.key === "ArrowDown") {
        ev.preventDefault();

        if (!isActivePlayer()) return;
        if (!isActivePlayerOperationDone()) return;

        adjustWeaponAngle("down");
      } else if (ev.key === " ") {
        ev.preventDefault();

        // 蓄力
        if (!isActivePlayer()) return;
        if (!isActivePlayerOperationDone()) return;

        adjustFiringPower();
      }
    }

    function onKeyup(ev: KeyboardEvent) {
      // console.log(ev)

      if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
        ev.preventDefault();

        if (!isActivePlayer()) return;
        if (!isActivePlayerOperationDone()) return;

        // 移动结束后，同步player的位置
        const centerPoint = activePlayer.current?.centerPoint;
        const direction = activePlayer.current?.direction;
        socketRef.current?.emit(
          "activePlayerMoveEnd",
          centerPoint,
          direction
        );
      } else if (ev.key === " ") {
        // fire
        ev.preventDefault();

        // 如果 clientPlayer 现在不是 activePlayer，则返回
        if (!isActivePlayer()) return;
        if (!isActivePlayerOperationDone()) return;
        setActivePlayerIsOperationDone(false)

        // fire时，把activePlayer的当前相关数据 传给server，
        // 然后server再发给其他player，更新其客户端activePlayer的数据
        socketRef.current?.emit("activePlayerFire", {
          activePlayerWeaponAngle: activePlayer.current!.weaponAngle,
          activePlayerFiringPower: activePlayer.current!.firingPower,

          // TODO 放在 playerUsesSkill 中
          activePlayerIsTrident: activePlayer.current!.isTrident,
        });
      }
    }

    function onContextmenu(ev: MouseEvent) {
      // ev.preventDefault()
    }

    function playerOffline(playerId: string) {
      console.info(`playerOffline: ${playerId}`);

      setPlayersData((prev) => {
        return prev.map((item) => {
          if (item.id === playerId) {
            item.isOnline = false;
          }
          return item;
        });
      });
    }

    function playerLeaveGame(playerId: string) {
      console.info(`playerLeaveGame: ${playerId}`);

      setPlayersData((prev) => {
        return prev.filter((item) => item.id !== playerId);
      });
    }

    function activePlayerMove(direction: Direction) {
      if (!activePlayer.current) return;
      activePlayer.current.isMoving = true;
      activePlayer.current.handlePlayerMove(direction);
    }

    function activePlayerMoveEnd(centerPoint: Point, direction: Direction) {
      if (!activePlayer.current) return;
      activePlayer.current.handlePlayerMoveEnd(centerPoint, direction);
    }

    function activePlayerFall(centerPoint: Point) {
      if (!activePlayer.current) return;
      activePlayer.current.playerFall(centerPoint);
    }

    function playerUsesSkill(skill: PlayerSkills) {
      if(!activePlayer.current) return
      switch (skill) {
        case 'oneMore': {
          activePlayer.current.numberOfFires++;
          setActivePlayerSkills((value) => value + "+1");
    
          break;
        }
        case 'twoMore': {
          break;
        }
        default:
          break;
      }
    }

    function activePlayerFire(firingData: FiringData) {
      if (!activePlayer.current) return;

      // 同步 clients的 activePlayer的数据
      const {
        activePlayerWeaponAngle,
        activePlayerFiringPower,
        activePlayerIsTrident,
      } = firingData;
      activePlayer.current.weaponAngle = activePlayerWeaponAngle;
      activePlayer.current.firingPower = activePlayerFiringPower;
      activePlayer.current.isTrident = activePlayerIsTrident;

      const initBeforeFiring = () => {
        // copy地图到offscreenCanvas
        bombDrawingOffscreenCanvas.current!.ctx.clearRect(
          0,
          0,
          bombDrawingOffscreenCanvas.current!.el.width,
          bombDrawingOffscreenCanvas.current!.el.height
        );
        bombDrawingOffscreenCanvas.current!.ctx.drawImage(
          logicalMapCanvas.current!.el,
          0,
          0
        );
        bombDrawingOffscreenCanvas.current!.ctx.lineWidth = mapCanvas.current!.ctx.lineWidth
        bombDrawingOffscreenCanvas.current!.ctx.strokeStyle = mapCanvas.current!.ctx.strokeStyle
        
        activePlayer.current!.firingPosition = {
          x: activePlayer.current!.centerPoint.x,
          y: activePlayer.current!.centerPoint.y - Player.BOUNDING_BOX_LENGTH
        }
      }

      if (activePlayer.current.isTrident) {
        if (mapCanvas.current) {
          // 如果当前 client是 activePlayer
          if (isActivePlayer()) {
            initBeforeFiring()
            activePlayer.current.tridentBombs = []
            activePlayer.current.playerStartToFireTrident();
          }
        }
      } else {
        if (mapCanvas.current) {
          // 如果当前 client是 activePlayer，则准备fire
          if (isActivePlayer()) {
            initBeforeFiring()
            activePlayer.current.playerStartToFire();
          }
        }
      }
    }

    // 同步 clients的 activePlayer的 bombsData数据
    function syncBombDataBeforePlayerFires(bombData: Bomb[], isTrident: boolean) {
      if (!activePlayer.current) return;
      
      console.log("syncBombDataBeforePlayerFires bombData", bombData);
      
      if(isTrident) {
        const tridentBombs = bombData

        tridentBombs.forEach(bomb => {
          // 注意 不能覆盖 clients之前就已经存在的那些bomb对象，因为不同设备的时间 不一定完全相同，所以bomb对象的firingTime 由设备自己决定
          if(activePlayer.current!.tridentBombs.find(_bomb => _bomb.id === bomb.id)) {
            return
          }
          else {
            activePlayer.current!.tridentBombs.push(bomb)
          }
        })

        // fire
        activePlayer.current.numberOfFires--;
        activePlayer.current.playerFiresTrident();
  
        // 如果当前 client是 activePlayer，则检查发射次数
        if(isActivePlayer()) {
          activePlayer.current.checkPlayerNumberOfFires(isTrident);
        }

      }
      else {
        const bombsData = bombData

        const newBombs: Bomb[] = []
        bombsData.forEach(bomb => {
          // 注意 不能覆盖 clients之前就已经存在的那些bomb对象，因为不同设备的时间 不一定完全相同，所以bomb对象的firingTime 由设备自己决定
          if(activePlayer.current!.bombsData.find(_bomb => _bomb.id === bomb.id)) {
            return
          }
          else {
            newBombs.push(bomb)
          }
        })

        // TODO
        // if(bombsData.length > 1) {
        //   transitionViewportOnActivePlayer()
        // }

        activePlayer.current!.bombsData.push(...newBombs)

        // fire
        activePlayer.current.numberOfFires--;
        activePlayer.current.playerFires();
  
        // 如果当前 client是 activePlayer，则检查发射次数
        if (isActivePlayer()) {
          activePlayer.current.checkPlayerNumberOfFires();
        }
        
      }
    }

    function startNextTurn(nextTurnData: { activePlayerId: string }) {
      console.log(
        `startNextTurn 轮到 activePlayer: ${nextTurnData.activePlayerId} 出手了`
      );
      setActivePlayerId(nextTurnData.activePlayerId);
      setActivePlayerSkills("");
      setIsNextTurnNotiVisible(true)

      activePlayer.current = playerRefs.current.find(
        (player) => player.id === nextTurnData.activePlayerId
      )!;
      if (!activePlayer.current) return
      // reset
      setActivePlayerIsOperationDone(true)
      activePlayer.current.numberOfFires = 1;
      activePlayer.current.isTrident = false;

      // 重绘所有players
      playerRefs.current.forEach((player) => {
        player.drawPlayer();
      });

      transitionViewportOnActivePlayer()
    }

    if (isReadyToInit) {
      if (
        !mapCanvasRef.current || 
        !inactiveCanvasRef.current || 
        !activeCanvasRef.current || 
        !bombCanvasRef.current || 
        !explosionParticleCanvasRef.current ||
        !miniMapCanvasRef.current
      ) {
        console.error("canvas is null");
        return;
      }

      console.log("initBattlefield");

      const {
        id, name, size, terrain, spawnPoints
      } = MULTIPLE_SIMPLE2

      // logicalMap
      // 根据 map 决定
      const logicalMapWidth = size.width
      const logicalMapHeight = size.height
      const logicalMapRatio = logicalMapWidth / logicalMapHeight

      logicalMapCanvas.current = new LogicalCanvas({
        logicalWidth: logicalMapWidth,
        logicalHeight: logicalMapHeight,
        initMap: terrain.soft,
      });

      // mapCanvas
      mapCanvas.current = new ScreenCanvas({
        logicalWidth: logicalMapWidth,
        logicalHeight: logicalMapHeight,
        initMap: terrain.soft,
        el: mapCanvasRef.current
      })

      // mini map
      let miniMapWidth = null
      let miniMapHeight = null
      
      if(logicalMapWidth >= logicalMapHeight) {
          // map的width较长，所以Mini map的width为200
          miniMapWidth = 200
      
          // 根据map的长宽比，得到mini map的height
          miniMapHeight = miniMapWidth / logicalMapRatio
      }   
      else {
          // map的height较长，所以Mini map的height为200
          miniMapHeight = 200
      
          miniMapWidth = miniMapHeight * logicalMapRatio
      }

      // mini viewport
      const miniViewportWidth = viewportSize.width * miniMapWidth / logicalMapWidth
      const miniViewportHeight = viewportSize.height * miniMapHeight / logicalMapHeight

      viewportToMiniViewportRatioRef.current = {
        widthRatio: viewportSize.width / miniViewportWidth,
        heightRatio: viewportSize.height / miniViewportHeight,
      }

      miniMapSizeRef.current = {
        miniMapWidth,
        miniMapHeight,
        miniViewportWidth,
        miniViewportHeight
      }

      // miniMapRef
      miniMapRef.current = new ScreenCanvas({
        logicalWidth: miniMapWidth,
        logicalHeight: miniMapHeight,
        el: miniMapCanvasRef.current
      })

      drawMiniMapFromMap()

      // bombImpact
      bombImpactCanvas.current = new ScreenCanvas({
        logicalWidth: logicalMapWidth,
        logicalHeight: logicalMapHeight,
      })

      // inactive
      inactiveCanvas.current = new ScreenCanvas({
        logicalWidth: logicalMapWidth,
        logicalHeight: logicalMapHeight,
        el: inactiveCanvasRef.current
      })

      // active
      activeCanvas.current = new ScreenCanvas({
        logicalWidth: logicalMapWidth,
        logicalHeight: logicalMapHeight,
        el: activeCanvasRef.current
      })

      // bomb canvas
      bombCanvas.current = new ScreenCanvas({
        logicalWidth: logicalMapWidth,
        logicalHeight: logicalMapHeight,
        el: bombCanvasRef.current
      })

      // bombDrawingOffscreenCanvas
      bombDrawingOffscreenCanvas.current = new LogicalCanvas({
        logicalWidth: logicalMapWidth,
        logicalHeight: logicalMapHeight,
      })

      // explosionParticleCanvas
      explosionParticleCanvas.current = new ScreenCanvas({
        logicalWidth: logicalMapWidth,
        logicalHeight: logicalMapHeight,
        el: explosionParticleCanvasRef.current
      });

      // viewport
      viewportRef.current = new Viewport({
        logicalMapSize: {
          width: logicalMapWidth,
          height: logicalMapHeight
        },
        viewportSize,

        mapCanvas: mapCanvas.current,
        inactiveCanvas: inactiveCanvas.current,
        activeCanvas: activeCanvas.current,
        bombCanvas: bombCanvas.current,
        explosionParticleCanvas: explosionParticleCanvas.current,

        onViewportUpdate,
      })

      viewportRef.current.updateViewport(true)

      // ExplosionParticleEffect
      explosionParticleEffectRef.current = new ExplosionParticleEffect(explosionParticleCanvas.current.ctx, () => {
        viewportRef.current?.setLayerTranslate('explosionParticle')
      })

      // TODO 等待所有players的bomb image都加载完毕
      const playerBombImage = new Image()
      playerBombImage.src = bombImage

      playersData.forEach((item) => {
        const {
          id,
          name,
          direction,
          centerPoint,

          healthMax,

          weapon,
        } = item;

        const player = new Player({
          msgHandler: msgHandler.current,

          logicalMapCanvas: logicalMapCanvas.current!,
          mapCanvas: mapCanvas.current!,
          bombImpactCanvas: bombImpactCanvas.current!,
          inactiveCanvas: inactiveCanvas.current!,
          activeCanvas: activeCanvas.current!,
          bombCanvas: bombCanvas.current!,
          bombDrawingOffscreenCanvas: bombDrawingOffscreenCanvas.current!,
          explosionParticleCanvas: explosionParticleCanvas.current!,
          testCanvas: testCanvas.current!,

          viewport: viewportRef.current!,
          miniMap: miniMapRef.current!,

          id,
          name,
          direction,
          centerPoint,

          healthMax,

          weapon: {
            ...weapon,
            bombImage: playerBombImage
          }
        });

        // 保存多个player实例
        playerRefs.current.push(player);

        if (player.id === activePlayerId) {
          // set activePlayer
          activePlayer.current = player;
        }

        if (player.id === client.id) {
          // set clientPlayer
          clientPlayer.current = player;

          // 同步状态
          const {
            id,
            name,
            angle,
            health,
            healthMax,

            // weapon,
            weaponAngle,
          } = player;
          setClientPlayerId(id);
          setClientPlayerName(name);
          setClientPlayerAngle(angle);
          setClientPlayerHealth(health);
          setClientPlayerHealthMax(healthMax);
          // 初始 weaponAngle
          setClientPlayerWeaponAngle(weaponAngle);
        }
      });

      playerRefs.current.forEach((player) => {
        player.drawPlayer();
      });

      // 注册事件
      socketRef.current?.on("playerOffline", playerOffline);
      socketRef.current?.on("playerLeaveGame", playerLeaveGame);
      socketRef.current?.on("activePlayerMove", activePlayerMove);
      socketRef.current?.on("activePlayerMoveEnd", activePlayerMoveEnd);
      socketRef.current?.on("activePlayerFall", activePlayerFall);
      socketRef.current?.on("playerUsesSkill", playerUsesSkill);
      socketRef.current?.on("activePlayerFire", activePlayerFire);
      socketRef.current?.on(
        "syncBombDataBeforePlayerFires",
        syncBombDataBeforePlayerFires
      );
      socketRef.current?.on("startNextTurn", startNextTurn);

      document.addEventListener("contextmenu", onContextmenu);
      document.body.addEventListener("keydown", onKeydown);
      document.body.addEventListener("keyup", onKeyup);

      // viewportRef.current.pathPoints = [...spawnPoints]

      playerBombImage.onload = function() { 
        console.log('bomb image 加载完成')

        // viewport停留在map中间 等待2s
        setTimeout(() => {
          // --- 游戏开始前的 viewport预览动画
          // 过渡到一个player -> 等待2s -> 过渡到下一个player -> ... ->
          // 过渡到activePlayer
          viewportPreviewAnim(spawnPoints, 0)

        }, CAMERA_FOCUS_DURATION);
      }
    }

    return () => {
      socketRef.current?.off("playerOffline", playerOffline);
      socketRef.current?.off("playerLeaveGame", playerLeaveGame);
      socketRef.current?.off("activePlayerMove", activePlayerMove);
      socketRef.current?.off("activePlayerMoveEnd", activePlayerMoveEnd);
      socketRef.current?.off("activePlayerFall", activePlayerFall);
      socketRef.current?.off("activePlayerFire", activePlayerFire);
      socketRef.current?.off("playerUsesSkill", playerUsesSkill);
      socketRef.current?.off(
        "syncBombDataBeforePlayerFires",
        syncBombDataBeforePlayerFires
      );
      socketRef.current?.off("startNextTurn", startNextTurn);

      document.removeEventListener("contextmenu", onContextmenu);
      document.body.removeEventListener("keydown", onKeydown);
      document.body.removeEventListener("keyup", onKeyup);
    };
  }, [isReadyToInit]);

  useEffect(()=>{
    if(isNextTurnNotiVisible) {
      nextTurnNotiTimerRef.current = setTimeout(()=>{
        setIsNextTurnNotiVisible(false)
        clearTimeout(nextTurnNotiTimerRef.current)
      }, 1500)
    }

    return ()=>{
      clearTimeout(nextTurnNotiTimerRef.current)
    }
  }, [isNextTurnNotiVisible])

  function handleDisconnect() {
    console.log("handleDisconnect");

    console.log("离开战场");
    navigate("/gameRoom");
  };

  function onViewportUpdate() {
    if(!viewportRef.current) return
    // 根据 viewport 当前的位置，计算 miniViewport 的位置
    const miniViewportTranslateX = (-viewportRef.current.translate.x / viewportRef.current.logicalMapSize.width) * miniMapSizeRef.current.miniMapWidth
    const miniViewportTranslateY = (-viewportRef.current.translate.y / viewportRef.current.logicalMapSize.height) * miniMapSizeRef.current.miniMapHeight
    setMiniViewportTranslate({
        x: miniViewportTranslateX,
        y: miniViewportTranslateY
    })
  }

  function onMiniMapUpdate(translateX: number, translateY: number) {
    // 同步viewport
    const viewportTranslateX = -translateX * viewportToMiniViewportRatioRef.current.widthRatio!
    const viewportTranslateY = -translateY * viewportToMiniViewportRatioRef.current.heightRatio!
    viewportRef.current?.setViewportTranslate({
      x: viewportTranslateX,
      y: viewportTranslateY
    })
    viewportRef.current?.updateViewport(false)
  }

  function drawMiniMapFromMap() {
    if(mapCanvas.current) {
      miniMapRef.current?.drawFrom(mapCanvas.current)
    }
  }

  function transitionViewportOnActivePlayer() {
    if(viewportRef.current) {
      viewportRef.current.transitionViewportToTarget(activePlayer.current!.centerPoint)
    }
  }

  function viewportPreviewAnim(spawnPoints: Point[], i : number) {
    viewportRef.current?.transitionViewportToTarget(spawnPoints[i], () => {
      setTimeout(() => {
        const next = i + 1
        if(next >= spawnPoints.length) {
          // 预览动画结束
          setIsNextTurnNotiVisible(true)
          setActivePlayerIsOperationDone(true)

          viewportRef.current?.transitionViewportToTarget(activePlayer.current!.centerPoint, () => {
            if(viewportRef.current) {
              viewportRef.current.isGamePreviewOver = true
            }
          })
        }
        else {
          viewportPreviewAnim(spawnPoints, next)
        }
      }, CAMERA_FOCUS_DURATION)
    })
  }

  function handleSkipAction() {
    if (!isActivePlayer()) return;

    socketRef.current?.emit("startNextTurn");
  }

  // clientPlayerFiringAngle
  const clientPlayerFiringAngle = clientPlayerAngle + clientPlayerWeaponAngle;

  // console.log('render')

  return (
    <div id="battle-field">
      {!isReadyToInit ? (
        <LoadingMask />
      ) : (
        <>
          <div id="viewport" style={{
            width: viewportSize.width,
            height: viewportSize.height
          }}> 
            <canvas id="map" ref={mapCanvasRef}></canvas>
            <canvas id="inactive" ref={inactiveCanvasRef}></canvas>
            <canvas id="active" ref={activeCanvasRef}></canvas>
            <canvas id="bomb" ref={bombCanvasRef}></canvas>
            <canvas id="explosionParticle" ref={explosionParticleCanvasRef}></canvas>
          </div>
          <div id="ui-container">
            <div className="left">
              <div className="item">
                isConnected: {isConnected && "connected!"}
              </div>
              <div className="item">
                {isReadyToInit && "gameStarted!"}
              </div>
              <div className="item">playerId: {clientPlayerId}</div>
              <div className="item">playerName: {clientPlayerName}</div>
              <div className="item">
                health: {clientPlayerHealth} / {clientPlayerHealthMax}
              </div>
              <div className="item">firingAngle: {clientPlayerFiringAngle}</div>
              <div className="item">firingPower: {clientPlayerFiringPower}</div>
              {/* <div className="item">
                <button onClick={connect}>connect</button>
              </div>  */}
              <div className="item">
                <button onClick={handleDisconnect}>disconnect</button>
              </div>
            </div>
            <div className="center">
              <div className="player-profiles">
                {
                  playersData.map((item) => {
                    return (
                      <div className="item" key={item.id} style={{ color: item.isOnline ? "green" : "black" }}>
                        { activePlayerId === item.id && '['}
                        {item.name}
                        { activePlayerId === item.id && ']'}
                        </div>
                    );
                  })
                }
              </div>
              {
                activePlayerId === clientPlayer.current?.id && isOperationDone &&
                (<div className="action-countdown">
                  <div className="skip" onClick={handleSkipAction}>跳过</div>
                </div>)
              }
            </div>
            <div className="right">

              <MiniMap ref={miniMapCanvasRef} miniViewportTranslate={miniViewportTranslate} miniMapSize={miniMapSizeRef.current} viewportRef={viewportRef} onMiniMapUpdate={onMiniMapUpdate} setMiniViewportTranslate={setMiniViewportTranslate}></MiniMap>

              <div className="item">
                <button onClick={() => {
                  transitionViewportOnActivePlayer()
                }}>anim</button>
              </div>
              <div className="item">activePlayerId: {activePlayerId}</div>
              <div className="item">skills: {activePlayerSkills}</div>
              <div className="item">
                <button
                  onClick={() => {
                    if (!isActivePlayer()) return;
                    if (!isActivePlayerOperationDone()) return;

                    socketRef.current?.emit('playerUsesSkill', activePlayer.current?.id, 'oneMore')
                  }}
                >
                  +1
                </button>
                <button
                  onClick={() => {
                    if (!isActivePlayer()) return;
                    if (!isActivePlayerOperationDone()) return;

                    activePlayer.current!.isTrident = true;
                    setActivePlayerSkills((value) => value + "+III");
                  }}
                >
                  III
                </button>
              </div>
              {/* <div className="item">
                <button
                  onClick={() => {
                    adjustWeaponAngle("up");
                  }}
                >
                  ↑
                </button>
                <button
                  onClick={() => {
                    adjustWeaponAngle("down");
                  }}
                >
                  ↓
                </button>
                <button
                  onClick={() => {
                    if (clientPlayer.current?.id !== activePlayer.current?.id)
                      return;
                    socketRef.current?.emit("activePlayerMove", "left");
                  }}
                >
                  ←
                </button>
                <button
                  onClick={() => {
                    if (clientPlayer.current?.id !== activePlayer.current?.id)
                      return;
                    socketRef.current?.emit("activePlayerMove", "right");
                  }}
                >
                  →
                </button>
              </div>
              <div className="item">
                <button
                  onTouchStart={() => {
                    if (!isActivePlayer()) return;
                    firingPowerTimer.current = setInterval(
                      adjustFiringPower,
                      50
                    );
                  }}
                  onTouchEnd={() => {
                    clearInterval(firingPowerTimer.current);
                    if (!isActivePlayer()) return;
                    if (!isActivePlayerOperationDone()) return;
                    activePlayer.current!.isOperationDone = false;

                    socketRef.current?.emit("activePlayerFire", {
                      activePlayerWeaponAngle:
                        activePlayer.current!.weaponAngle,
                      activePlayerFiringPower:
                        activePlayer.current!.firingPower,
                      activePlayerNumberOfFires:
                        activePlayer.current!.numberOfFires,
                      activePlayerIsTrident: activePlayer.current!.isTrident,
                    });
                  }}
                >
                  fire
                </button>
              </div>  */}
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
          {tip && <Tip tip={tip} />}
          {isNextTurnNotiVisible && <NextTurnNoti activePlayerName={activePlayer.current?.name} />}
        </>
      )}
    </div>
  );
};

const LoadingMask = () => {
  return (
    <div id="loading-mask">
      <div className="loading">loading...</div>
    </div>
  );
};

interface TipProps {
  tip: string;
}

const Tip = (props: TipProps) => {
  const { tip } = props;

  return (
    <div id="tip">
      <div className="tip-mask"></div>
      <div className="tip-content">
        <div>{tip}</div>
      </div>
    </div>
  );
}

interface NextTurnNotiProps {
  activePlayerName?: string;
}


const NextTurnNoti = (props: NextTurnNotiProps) => {
  const { activePlayerName } = props;

  if(!activePlayerName) {
    return null
  }

  return (
    <div id="next-turn-noti">
        轮到 <span>{activePlayerName}</span> 出手了
    </div>
  );
}

export default Battlefield;
