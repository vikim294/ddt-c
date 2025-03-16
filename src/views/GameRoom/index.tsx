import "./index.scss";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";

// import { SOCKET_SERVER_URL } from "../../utils/conf";
import { SocketContext } from "../../context/socket/socketContext";
import { GameRoomInfo } from "../../api/gameRoom";
import { useAppSelector } from "../../store/hooks";

interface ClientPlayer {
  id: string;
  name: string;
  level: number;
  healthMax: number;
  weapon: {
    angleRange: number;
    damage: number;
  },
}

const player: ClientPlayer = {
  id: `player_${window.navigator.userAgent.length}`,
  name: `player_${window.navigator.userAgent.length}`,
  level: navigator.userAgent.length,
  healthMax: 1000,
  weapon: {
    angleRange: 30,
    damage: 250,
  },
};

const GameRoom: React.FC = () => {
  const [isMatching, setIsMatching] = useState<boolean | null>(null);
  const [matchingTimeout, setMatchingTimeout] = useState(0);
  const matchingTimerIdRef = useRef<number | undefined>();
  const [matchedPlayers, setMatchedPlayers] = useState<ClientPlayer[]>([]);
  const navigate = useNavigate();
  const { gameRoomId } = useParams();
  const socket = useContext(SocketContext)
  const [gameRoom, setGameRoom] = useState<GameRoomInfo | null>(null)
  const userInfo = useAppSelector((state) => state.userInfo.value)

  const toggleMatching = () => {
    setIsMatching((v) => !v);
  };

  const cancelMatching = useCallback(() => {
    if (socket) {
      clearInterval(matchingTimerIdRef.current);
      setMatchingTimeout(0);
      setMatchedPlayers([]);
      socket.emit("cancelMatching");
    }
  }, [socket]);

  const matchingCompleted = useCallback((battlefieldId: string) => {
    clearInterval(matchingTimerIdRef.current);
    setMatchingTimeout(0);

    console.log("matchingCompleted 准备进入战场");
    setTimeout(() => {
      // 进入战场
      navigate(`/battlefield/${gameRoomId}/${battlefieldId}`);
    }, 2000);
  }, [gameRoomId, navigate]);

  const goBackHome = () => {
    console.log('leaveRoom')

    if(!socket || !userInfo) {
      return
    }

    if (isMatching) {
      setIsMatching(false)
    }

    // 主动离开房间
    socket.emit('leaveRoom', {
      userId: userInfo.id,
      gameRoomId
    })

    // 回到home
    navigate('/');
  }

  const matchmakingCompleted = useCallback((matchedPlayers: ClientPlayer[], battlefieldId: string) => {
    console.log("matchmakingCompleted", matchedPlayers, battlefieldId);
    setMatchedPlayers(matchedPlayers);
    matchingCompleted(battlefieldId);
  }, [matchingCompleted])

  function updateGameRoomInfo(gameRoom: GameRoomInfo) {
    console.log('updateGameRoomInfo', gameRoom)
    setGameRoom(gameRoom)
  }

  useEffect(() => {
    socket?.on('enterRoom', updateGameRoomInfo)
    socket?.on('leaveRoom', updateGameRoomInfo)
    socket?.on("matchmakingCompleted", matchmakingCompleted);

    return () => {
      socket?.off('enterRoom', updateGameRoomInfo)
      socket?.off('leaveRoom', updateGameRoomInfo)
      socket?.off("matchmakingCompleted", matchmakingCompleted);
    }
  }, [socket, matchmakingCompleted])

  useEffect(() => {
    console.log("effect");

    if (socket && userInfo) {
      if (isMatching) {
        // 开启60s计时
        clearInterval(matchingTimerIdRef.current);
        matchingTimerIdRef.current = setInterval(() => {
          setMatchingTimeout((v) => {
            if (v === 60) {
              // 取消匹配
              setIsMatching(false);
              return 60;
            }
            return v + 1;
          });
        }, 1000);

        const player = {
          id: userInfo.id,
          name: userInfo.name,

          level: 1,
          health: 1000,
          healthMax: 1000,
          weapon: {
            angleRange: 30,
            damage: 250,
          },

          centerPoint: null,
          direction: null
        }
        socket.emit('requestMatching', player)

        //     socketRef.current.on("offlineInquiry", () => {
        //       socketRef.current.emit("offlineInquiryAck");
        //     });
        //     socketRef.current.on("playerOffline", (player) => {
        //       setPlayers((v) => {
        //         return v.map((item) => {
        //           if (item.id === player.id) {
        //             return {
        //               ...item,
        //               isOnline: false,
        //             };
        //           }
        //           return item;
        //         });
        //       });
        //     });
        //     socketRef.current.on("playerReconnection", (player, roomPlayers) => {
        //       if (player.id === client.id) {
        //         setMatchingSucceeded(true);
        //       }
        //       setPlayers(
        //         roomPlayers.map((item) => {
        //           return {
        //             ...item,
        //           };
        //         })
        //       );
        //     });
        //   }

      }
      else if (isMatching === false) {
        cancelMatching();
      }
    }
  }, [isMatching, socket, userInfo, cancelMatching]);

  useEffect(() => {
    if (socket && gameRoomId) {
      console.log('enterRoom')
      socket.emit('enterRoom', gameRoomId)
    }

    return () => {
      // 刷新页面后 effect的cleanup中 socket为null
      // console.log('clean up', socket, userInfo, gameRoomId)

      // if (socket && userInfo && gameRoomId) {
      //   console.log('leaveRoom')

      //   // 用户离开房间
      //   socket.emit('leaveRoom', {
      //     userId: userInfo.id,
      //     gameRoomId
      //   })
      // }
    }
  }, [gameRoomId, socket, userInfo])

  console.log("render");

  if (!gameRoomId || !gameRoom) {
    console.log(gameRoomId, gameRoom)
    return '无效的房间'
  }

  return (
    <div className="game-room">
      <h1>Game Room</h1>

      <div className="info">
        <div>
          <label>gameRoomId：</label>
          <span>{gameRoomId}</span>
        </div>

        <div>------------------------------------</div>
        <div>
          <label>玩家ID：</label>
          <span>{player.id}</span>
        </div>
        <div>
          <label>房间号：</label>
          <span>123456</span>
        </div>
        {isMatching && (
          <div>
            <label>匹配状态：{matchedPlayers.length !== 0 && "✔️"}</label>
            {matchedPlayers.length === 0 ? (
              <span>匹配中: ({matchingTimeout})</span>
            ) : (
              matchedPlayers.map((player, index) => (
                <div key={player.id}>
                  <span>player{index + 1}：</span>
                  <span>{player.id}</span>/<span>level： {player.level}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {matchedPlayers.length === 0 && (
        <div className="operation">
          <div onClick={toggleMatching} style={{ display: 'block', padding: 10, backgroundColor: '#ccc', cursor: 'pointer' }}>
            {isMatching ? "取消匹配" : "开始匹配"}
          </div>
          <div>
            <button onClick={goBackHome}>返回home</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;
