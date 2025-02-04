import { createContext, useEffect, useState } from "react";
import { ReactNode } from "react";
import { SOCKET_SERVER_URL } from "../utils/conf";
import { io, Socket } from "socket.io-client";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setUserOnlineState } from "../store/userOnlineStateSlice";

export const SocketContext = createContext<Socket | null>(null)

export const SocketProvider = ({ children }: { children: ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null)
    const token = useAppSelector((state) => state.userInfo.value?.token)
    const dispatch = useAppDispatch()

    useEffect(() => {
        function connect() {
            console.log("connected");
            dispatch(setUserOnlineState(true));
        }

        function disconnect() {
            console.log("disconnect");
            dispatch(setUserOnlineState(false));
        }

        // 登录后 连接 ws服务器
        if (token) {
            const socket = io(`${SOCKET_SERVER_URL}`, {
                auth: {
                    token
                },
            })
            socket.on("connect", connect);
            socket.on("disconnect", disconnect);

            setSocket(socket)
        }

        return () => {
            if(socket) {
                socket.disconnect()
                socket.off("connect", connect);
                socket.off("disconnect", disconnect);
            }
        }
    }, [token])

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    )
}

