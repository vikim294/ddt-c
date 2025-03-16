import { useCallback, useEffect, useState } from "react";
import { ReactNode } from "react";
import { SOCKET_SERVER_URL } from "../../utils/conf";
import { io, Socket } from "socket.io-client";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { setUserOnlineState } from "../../store/userOnlineStateSlice";
import { SocketContext } from "./socketContext";

export const SocketProvider = ({ children }: { children: ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null)
    const token = useAppSelector((state) => state.userInfo.value?.token)
    const dispatch = useAppDispatch()

    const connect = useCallback(() => {
        console.log("connected");
        dispatch(setUserOnlineState(true));
    }, [dispatch])

    const disconnect = useCallback(() => {
        console.log("disconnect");
        dispatch(setUserOnlineState(false));
    }, [dispatch])

    useEffect(() => {
        console.log('socket provider mounted')
    }, [])

    useEffect(() => {
        let socketInstance = null

        // 登录后 连接 ws服务器
        if (token) {
            socketInstance = io(`${SOCKET_SERVER_URL}`, {
                auth: {
                    token
                },
            })
            setSocket(socketInstance)
        }

        return () => {
            socketInstance?.disconnect()
        }
    }, [token])

    useEffect(() => {
        socket?.on("connect", connect);
        socket?.on("disconnect", disconnect);

        return () => {
            socket?.off("connect", connect);
            socket?.off("disconnect", disconnect);
        }
    }, [socket, connect, disconnect])

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    )
}

