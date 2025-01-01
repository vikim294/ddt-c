import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useEffect, useRef } from "react";
import { useState } from "react";
import { io, Socket } from "socket.io-client";
import "./index.css";
import { Canvas, MapCanvas, Point } from "../../libs/canvas";
import { MULTIPLE } from "../../assets/maps";
import {
  Bomb,
  BombTarget,
  checkBombEffect,
  Direction,
  Player,
  Weapon,
} from "../../libs/player";

interface ClientPlayer {
  id: string;
  level: number;
}

const client: ClientPlayer = {
  id: `player_${window.navigator.userAgent.length}`,
  level: navigator.userAgent.length,
};

interface InitBattlefieldData {
  activePlayerId: string;
  players: {
    id: string;
    name: string;
    centerPoint: {
      x: number;
      y: number;
    };
    direction: Direction;

    healthMax: number;

    weapon: Weapon;
  }[];
}

interface FiringData {
  activePlayerWeaponAngle: number;
  activePlayerFiringPower: number;
  activePlayerNumberOfFires: number;
  activePlayerIsTrident: boolean;
}

export interface MsgHandler {
  getClientPlayerId: () => string;
  isActivePlayer: (playerId: string) => boolean;
  onPlayerFall: () => void;
  syncBombDataBeforePlayerFires: (bombsData: Bomb[]) => void;
  checkBombEffect: (bombTarget: BombTarget) => void;
  setActivePlayerFiringAngle: (angle: number) => void;
  resetActivePlayerFiringPower: () => void;
  getIsDrawingBomb: () => boolean;
  setIsDrawingBomb: (isDrawingBomb: boolean) => void;
  startNextTurn: () => void;
}

const Battlefield: React.FC = () => {
  // const [isFullScreen, setIsFullScreen] = useState(null)
  // const [print, setPrint] = useState('')

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const battlefieldId = searchParams.get("battlefieldId");

  const [isConnected, setIsConnected] = useState(false);
  const [initBattlefieldData, setInitBattlefieldData] =
    useState<InitBattlefieldData>();
  const [tip, setTip] = useState("");

  const [activePlayerId, setActivePlayerId] = useState("");
  const [activePlayerSkills, setActivePlayerSkills] = useState("");

  const mapCanvasRef = useRef(null);
  const mapCanvas = useRef<MapCanvas>();

  const inactiveCanvasRef = useRef(null);
  const inactiveCanvas = useRef<Canvas>();

  const activeCanvasRef = useRef(null);
  const activeCanvas = useRef<Canvas>();

  const bombCanvasRef = useRef(null);
  const bombCanvas = useRef<Canvas>();

  const bombDrawingOffscreenCanvasRef = useRef(
    document.createElement("canvas")
  );
  const bombDrawingOffscreenCanvas = useRef<Canvas>(
    new Canvas({
      el: bombDrawingOffscreenCanvasRef.current,
      width: 1920,
      height: 1080,
      willReadFrequently: true,
    })
  );
  const isDrawingBombRef = useRef(false);

  const playerRefs = useRef<Player[]>([]);
  const activePlayer = useRef<Player>();
  const clientPlayer = useRef<Player>();

  const socketRef = useRef<Socket>();
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

  const msgHandler = useRef({
    getClientPlayerId() {
      return client.id;
    },

    isActivePlayer(playerId: string) {
      return activePlayer.current?.id === playerId;
    },

    onPlayerFall() {
      socketRef.current?.emit(
        "activePlayerFall",
        activePlayer.current?.centerPoint
      );
    },

    syncBombDataBeforePlayerFires(bombsData: Bomb[]) {
      socketRef.current?.emit("syncBombDataBeforePlayerFires", bombsData);
    },

    checkBombEffect(bombTarget: BombTarget) {
      playerRefs.current.forEach((player) => {
        checkBombEffect(bombTarget, player);
      });
    },

    setActivePlayerFiringAngle(angle: number) {
      // 如果当前clientPlayer 是 activePlayer
      if (clientPlayer.current?.id === activePlayer.current?.id) {
        // 更新 angle状态
        setClientPlayerAngle(angle);
      }
    },

    resetActivePlayerFiringPower() {
      if (activePlayer.current) {
        activePlayer.current.firingPower = 0;
      }
      if (isActivePlayer()) {
        setClientPlayerFiringPower(0);
      }
    },

    getIsDrawingBomb() {
      return isDrawingBombRef.current;
    },

    setIsDrawingBomb(isDrawingBomb: boolean) {
      isDrawingBombRef.current = isDrawingBomb;
    },

    startNextTurn() {
      if (activePlayer.current?.id === client.id) {
        setTimeout(() => {
          activePlayer.current!.isOperationDone = true;
          socketRef.current?.emit("startNextTurn");
        }, 2000);
      }
    },
  });

  //

  useEffect(() => {
    function connect() {
      console.log('connect')
      setIsConnected(true);
      setTip("");
      socketRef.current?.emit("joinBattlefield");
    }

    function initBattlefield(data: InitBattlefieldData) {
      // 初始化
      console.log("initBattlefield data:", data);
      setInitBattlefieldData(data);
    }

    function playerReconnectsBattlefield(playerId: string) {
      console.log(`playerReconnectsBattlefield: ${playerId}`);
      if (client.id === playerId) {
        // 如果当前client 是 重连的player
        // 同步最新数据
        console.log("同步最新数据");
      }
      else {
        // 更新player的在线状态
        console.log(`更新player的在线状态: ${playerId}`);
      }
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
      socketRef.current = io("http://192.168.1.107:3000/battlefield", {
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
      ev.preventDefault();
      // console.log(ev)

      if (ev.key === "ArrowRight") {
        // 如果 clientPlayer 现在不是 activePlayer，则返回
        if (!isActivePlayer()) return;
        handlePlayerMove("right");
      } else if (ev.key === "ArrowLeft") {
        if (!isActivePlayer()) return;
        handlePlayerMove("left");
      } else if (ev.key === "ArrowUp") {
        adjustWeaponAngle("up");
      } else if (ev.key === "ArrowDown") {
        adjustWeaponAngle("down");
      } else if (ev.key === " ") {
        // 蓄力
        if (!isActivePlayer()) return;
        if (!isActivePlayerOperationDone()) return;
        adjustFiringPower();
      }
    }

    function onKeyup(ev: KeyboardEvent) {
      ev.preventDefault();
      // console.log(ev)

      if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
        if (!isActivePlayer()) return;

        // 移动结束后，同步player的位置
        const centerPoint = activePlayer.current?.centerPoint;
        socketRef.current?.emit(
          "activePlayerMoveEnd",
          centerPoint
        );
      } else if (ev.key === " ") {
        // 如果 clientPlayer 现在不是 activePlayer，则返回
        if (!isActivePlayer()) return;
        if (!isActivePlayerOperationDone()) return;
        activePlayer.current!.isOperationDone = false;

        // fire时，把activePlayer的当前相关数据 传给server，
        // 然后server再发给其他player，更新其客户端activePlayer的数据
        socketRef.current?.emit("activePlayerFire", {
          activePlayerWeaponAngle: activePlayer.current!.weaponAngle,
          activePlayerFiringPower: activePlayer.current!.firingPower,
          activePlayerNumberOfFires: activePlayer.current!.numberOfFires,
          activePlayerIsTrident: activePlayer.current!.isTrident,
        });
      }
    }

    function onContextmenu(ev: MouseEvent) {
      // ev.preventDefault()
    }

    function playerOffline(playerId: string) {
      console.info(`playerOffline: ${playerId}`);
    }

    function playerLeaveGame(playerId: string) {
      console.info(`playerLeaveGame: ${playerId}`);
    }

    function activePlayerMove(direction: Direction) {
      if (!activePlayer.current) return;
      activePlayer.current.isMoving = true;
      activePlayer.current.handlePlayerMove(direction);
    }

    function activePlayerMoveEnd(centerPoint: Point) {
      if (!activePlayer.current) return;
      activePlayer.current.handlePlayerMoveEnd(centerPoint);
    }

    function activePlayerFall(centerPoint: Point) {
      if (!activePlayer.current) return;
      activePlayer.current.playerFall(centerPoint);
    }

    function activePlayerFire(firingData: FiringData) {
      if (!activePlayer.current) return;
      // 同步 clients的 activePlayer的数据
      const {
        activePlayerWeaponAngle,
        activePlayerFiringPower,
        activePlayerIsTrident,
        activePlayerNumberOfFires,
      } = firingData;
      activePlayer.current.weaponAngle = activePlayerWeaponAngle;
      activePlayer.current.firingPower = activePlayerFiringPower;
      activePlayer.current.isTrident = activePlayerIsTrident;
      activePlayer.current.numberOfFires = activePlayerNumberOfFires;

      if (activePlayer.current.isTrident) {
        activePlayer.current.playerStartToFireTrident();
      } else {
        if (mapCanvas.current) {
          // 如果当前 client是 activePlayer，则准备fire
          if (isActivePlayer()) {
            bombDrawingOffscreenCanvas.current.ctx.clearRect(
              0,
              0,
              bombDrawingOffscreenCanvas.current.el.width,
              bombDrawingOffscreenCanvas.current.el.height
            );
            bombDrawingOffscreenCanvas.current.ctx.drawImage(
              mapCanvas.current.el,
              0,
              0
            );
            activePlayer.current.playerStartToFire();
          }
        }
      }
    }

    function syncBombDataBeforePlayerFires(bombsData: Bomb[]) {
      if (!activePlayer.current) return;
      // 同步 clients的 activePlayer的 bombsData数据
      console.log("bombsData", bombsData);
      activePlayer.current.bombsData = bombsData;
      // fire
      activePlayer.current.numberOfFires--;
      activePlayer.current.playerFires();
      // 如果当前 client是 activePlayer，则检查发射次数
      if (isActivePlayer()) {
        activePlayer.current.checkPlayerNumberOfFires();
      }
    }

    function startNextTurn(nextTurnData: { activePlayerId: string }) {
      alert(
        `startNextTurn 轮到 activePlayer: ${nextTurnData.activePlayerId} 出手了`
      );
      setActivePlayerId(nextTurnData.activePlayerId);
      setActivePlayerSkills("");

      activePlayer.current = playerRefs.current.find(
        (player) => player.id === nextTurnData.activePlayerId
      );
      if (!activePlayer.current) {
        return;
      }
      activePlayer.current.numberOfFires = 1;
      activePlayer.current.isTrident = false;

      // 重绘所有players
      playerRefs.current.forEach((player) => {
        player.drawPlayer();
      });
    }

    if (initBattlefieldData) {
      if (
        !mapCanvasRef.current ||
        !inactiveCanvasRef.current ||
        !activeCanvasRef.current ||
        !bombCanvasRef.current
      ) {
        console.error("canvasRef is null");
        return;
      }

      console.log("initBattlefield");

      mapCanvas.current = new MapCanvas({
        el: mapCanvasRef.current,
        // width: window.innerWidth,
        width: 1920,
        // height: window.innerHeight,
        height: 1080,
        initMap: MULTIPLE,
      });

      inactiveCanvas.current = new Canvas({
        el: inactiveCanvasRef.current,
        // width: window.innerWidth,
        width: 1920,
        // height: window.innerHeight,
        height: 1080,
      });

      activeCanvas.current = new Canvas({
        el: activeCanvasRef.current,
        // width: window.innerWidth,
        width: 1920,
        // height: window.innerHeight,
        height: 1080,
      });

      bombCanvas.current = new Canvas({
        el: bombCanvasRef.current,
        // width: window.innerWidth,
        width: 1920,
        // height: window.innerHeight,
        height: 1080,
      });

      const { activePlayerId, players } = initBattlefieldData;

      setActivePlayerId(activePlayerId);

      players.forEach((item) => {
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

          mapCanvas: mapCanvas.current!,
          inactiveCanvas: inactiveCanvas.current!,
          activeCanvas: activeCanvas.current!,
          bombCanvas: bombCanvas.current!,
          bombDrawingOffscreenCanvas: bombDrawingOffscreenCanvas.current,

          id,
          name,
          direction,
          centerPoint,

          healthMax,

          weapon,
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

      //
      socketRef.current?.on("playerOffline", playerOffline);
      socketRef.current?.on("playerLeaveGame", playerLeaveGame);
      socketRef.current?.on("activePlayerMove", activePlayerMove);
      socketRef.current?.on("activePlayerMoveEnd", activePlayerMoveEnd);
      socketRef.current?.on("activePlayerFall", activePlayerFall);
      socketRef.current?.on("activePlayerFire", activePlayerFire);
      socketRef.current?.on(
        "syncBombDataBeforePlayerFires",
        syncBombDataBeforePlayerFires
      );
      socketRef.current?.on("startNextTurn", startNextTurn);

      document.addEventListener("contextmenu", onContextmenu);
      document.body.addEventListener("keydown", onKeydown);
      document.body.addEventListener("keyup", onKeyup);
    }

    return () => {
      socketRef.current?.off("playerOffline", playerOffline);
      socketRef.current?.off("playerLeaveGame", playerLeaveGame);
      socketRef.current?.off("activePlayerMove", activePlayerMove);
      socketRef.current?.off("activePlayerMoveEnd", activePlayerMoveEnd);
      socketRef.current?.off("activePlayerFall", activePlayerFall);
      socketRef.current?.off("activePlayerFire", activePlayerFire);
      socketRef.current?.off(
        "syncBombDataBeforePlayerFires",
        syncBombDataBeforePlayerFires
      );
      socketRef.current?.off("startNextTurn", startNextTurn);

      document.removeEventListener("contextmenu", onContextmenu);
      document.body.removeEventListener("keydown", onKeydown);
      document.body.removeEventListener("keyup", onKeyup);
    };
  }, [initBattlefieldData]);

  const handleDisconnect = () => {
    console.log("handleDisconnect");

    console.log("离开战场");
    navigate("/gameRoom");
  };

  // clientPlayerFiringAngle
  const clientPlayerFiringAngle = clientPlayerAngle + clientPlayerWeaponAngle;

  // console.log('render')

  return (
    <div id="battle-field">
      {!initBattlefieldData ? (
        <LoadingMask />
      ) : (
        <div id="content">
          <div id="canvas-container">
            <canvas id="map" ref={mapCanvasRef}></canvas>
            <canvas id="inactive" ref={inactiveCanvasRef}></canvas>
            <canvas id="active" ref={activeCanvasRef}></canvas>
            <canvas id="bomb" ref={bombCanvasRef}></canvas>
          </div>
          <div id="ui-container">
            <div className="left">
              <div className="item">
                isConnected: {isConnected && "connected!"}
              </div>
              <div className="item">
                {initBattlefieldData && "gameStarted!"}
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
            <div className="right">
              <div className="item">activePlayerId: {activePlayerId}</div>
              <div className="item">skills: {activePlayerSkills}</div>
              <div className="item">
                <button
                  onClick={() => {
                    if (!isActivePlayer()) return;
                    if (!isActivePlayerOperationDone()) return;
                    activePlayer.current!.numberOfFires++;
                    setActivePlayerSkills((value) => value + "+1");
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
              <div className="item">
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
          {tip && <Tip tip={tip} />}
        </div>
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

export default Battlefield;
