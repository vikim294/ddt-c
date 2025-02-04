import { apiGet, apiPost } from "../utils/http"



// export const createGameRoom = (data: {
//     uid: number
// }) => {
//     return apiPost<{
//         gameRoomId: number
//     }>(`/gameRoom/createGameRoom`, data)
// }

interface Player {
    id: number
    name: string,
}

type RoomStatus = 'waiting' | 'started'

export interface GameRoomInfo {
    id: string
    hostId: number
    createdAt: string
    size: number
    status: RoomStatus
    players: Player[]
}

interface getRoomResData {
    gameRoom: GameRoomInfo
}

export const getRoom = (params: {
    gameRoomId: string
}) => {
    return apiGet<getRoomResData>(`/gameRoom/info`, params)
}

export type GameRoomList = {
    id: string
    playerNum: number
    size: number
    status: RoomStatus
}[]

interface GetRoomListResData {
    gameRoomList: GameRoomList
}

export const getRoomList = () => {
    return apiGet<GetRoomListResData>(`/gameRoom/list`)
}

export const enterRoom = (data: {
    gameRoomId: string, userId: number
}) => {
    return apiPost(`/gameRoom/enter`, data)
}