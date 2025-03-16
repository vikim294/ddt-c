import "./index.scss"
import { useAppDispatch, useAppSelector } from "../../store/hooks"
import { getUsers } from "../../api/user"
import { useNavigate } from "react-router-dom";
import { clearUserInfo } from "../../store/userInfoSlice";
import { enterRoom, GameRoomList, getRoomList } from "../../api/gameRoom";
import ResolutionSelect from "./components/resolution";
import { useContext, useEffect, useState } from "react";
import { SocketContext } from "../../context/socket/socketContext";

function Home() {
    const userInfo = useAppSelector((state) => state.userInfo.value)
    const userOnlineState = useAppSelector((state) => state.userOnlineState.value)
    const updateTokenTimerId = useAppSelector((state) => state.updateTokenTimer.value)

    const dispatch = useAppDispatch()
    const navigate = useNavigate();
    const socket = useContext(SocketContext)
    const [gameRoomList, setGameRoomList] = useState<GameRoomList>([])

    async function getUserList() {
        const res = await getUsers()
        console.log('res', res)
    }

    function handleCreateGameRoom() {
        if (userInfo && socket) {
            socket.emit('createGameRoom', {
                hostId: userInfo.id
            })
        }
    }

    async function handleEnterRoom(gameRoomId: string) {
        if (!userInfo) return

        // 加入房间
        await enterRoom({
            gameRoomId,
            userId: userInfo.id
        })

        // 加入房间成功
        if (socket) {
            // 跳转
            navigate(`/gameRoom/${gameRoomId}`);
        }
    }

    function logout() {
        // 清除 userInfo
        localStorage.removeItem('userInfo')
        dispatch(clearUserInfo())
        // 断开 socket连接
        if (socket) {
            socket.disconnect()
        }
        // 跳转到登录页
        navigate("/login");

        // 取消 更新token请求（如果存在）
        if(updateTokenTimerId) {
            // console.log('updateTokenTimerId', updateTokenTimerId)
            clearTimeout(updateTokenTimerId)
        }
    }

    // home页面加载后
    useEffect(() => {
        async function getGameRoomList() {
            const res = await getRoomList()

            console.log('getGameRoomList', res)

            setGameRoomList(res.data.gameRoomList)
        }
  
        // 获取部分房间信息
        getGameRoomList()
    }, [])

    // socket连接后
    useEffect(() => {
        function onGameRoomCreated(gameRoomId: string) {
            console.log('onGameRoomCreated', gameRoomId)

            if (socket) {
                navigate(`/gameRoom/${gameRoomId}`);
            }
        }

        // 添加消息监听
        socket?.on("gameRoomCreated", onGameRoomCreated);

        return () => {
            console.log("cleanup");

            socket?.off("gameRoomCreated", onGameRoomCreated);
        }
    }, [socket, navigate])

    return (
        <div className="home">
            <h1>home</h1>
            <div>
                <div>
                    <label>connection:</label>
                    <span>{userOnlineState ? '✔' : '❌'}</span>
                </div>
                <div>
                    <label>id:</label>
                    <span>{userInfo?.id}</span>
                </div>
                <div>
                    <label>username:</label>
                    <span>{userInfo?.name}</span>
                </div>
            </div>
            <div className="game-rooms">
                {
                    gameRoomList.map(room => {
                        return (
                            <div className="item" style={{
                                cursor: 'pointer'
                            }} key={room.id} onClick={() => {
                                handleEnterRoom(room.id)
                            }}>
                                <div>房间：{room.id}</div>
                                <div>{room.playerNum} / {room.size}</div>
                                <div>状态：{room.status}</div>
                            </div>
                        )
                    })
                }
            </div>
            <div>
                <div>
                    <button onClick={getUserList}>getUserList</button>
                </div>
                <div>
                    <button onClick={handleCreateGameRoom}>createGameRoom</button>
                </div>
                <div>
                    <ResolutionSelect></ResolutionSelect>
                </div>
                <div>
                    <button onClick={logout}>logout</button>
                </div>
            </div>
        </div>
    )
}

export default Home