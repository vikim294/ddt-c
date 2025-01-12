import "./index.scss";
import React, { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { io, Socket } from "socket.io-client";
import { SOCKET_SERVER_URL } from "../../utils/conf";

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
  const socketRef = useRef<Socket>();
  const [isMatching, setIsMatching] = useState(false);
  const [connectionState, setConnectionState] = useState(false);
  const [matchingTimeout, setMatchingTimeout] = useState(0);
  const matchingTimerIdRef = useRef<number | undefined>();
  const [matchedPlayers, setMatchedPlayers] = useState<ClientPlayer[]>([]);

  const navigate = useNavigate();

  const toggleMatching = () => {
    setIsMatching((v) => !v);
  };

  const cancelMatching = () => {
    clearInterval(matchingTimerIdRef.current);
    setMatchingTimeout(0);
    setMatchedPlayers([]);
    socketRef.current?.emit("cancelMatching");
  };

  const matchingCompleted = (battlefieldId: string) => {
    clearInterval(matchingTimerIdRef.current);
    setMatchingTimeout(0);

    console.log("matchingCompleted 准备进入战场");
    setTimeout(() => {
      // 进入战场
      navigate("/battlefield?battlefieldId=" + battlefieldId);
    }, 2000);
  };

  useEffect(() => {
    console.log("effect");

    function connect() {
      console.log("connected");
      setConnectionState(true);
      // 开始匹配
      socketRef.current?.emit("requestMatching", player);
    }

    function disconnect() {
      console.log("disconnect");
      setConnectionState(false);
    }

    function matchmakingCompleted(matchedPlayers: ClientPlayer[], battlefieldId: string) {
      console.log("matchmakingCompleted", matchedPlayers, battlefieldId);
      setMatchedPlayers(matchedPlayers);
      matchingCompleted(battlefieldId);
    }

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

      // 连接服务器
      socketRef.current = io(`${SOCKET_SERVER_URL}/matchmaking`, {
        auth: {
          token: player.id,
        },
      });
      // console.log("socketRef.current", socketRef.current);

      socketRef.current.on("connect", connect);
      socketRef.current.on("disconnect", disconnect);
      socketRef.current.on("matchmakingCompleted", matchmakingCompleted);

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
      
    } else {
      cancelMatching();
    }

    return () => {
      console.log("cleanup");
      socketRef.current?.disconnect();
      socketRef.current?.off("connect", connect);
      socketRef.current?.off("disconnect", disconnect);
      socketRef.current?.off("matchmakingCompleted", matchmakingCompleted);
    };
  }, [isMatching]);

  console.log("render");

  return (
    <div className="game-room">
      <h1>Game Room</h1>

      <div className="info">
        <div>
          <label>玩家ID：</label>
          <span>{player.id}</span>
        </div>
        <div>
          <label>房间号：</label>
          <span>123456</span>
        </div>
        <div>
          <label>连接状态：</label>
          <span>{connectionState ? "✔️" : "❌"}</span>
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
          <div onClick={toggleMatching} style={{display: 'block', padding: 10, backgroundColor: '#ccc', cursor: 'pointer'}}>
            {isMatching ? "取消匹配" : "开始匹配"}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;
