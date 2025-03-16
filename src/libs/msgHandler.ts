import { Bomb, BombTarget, Player } from './player';
import { Point } from './canvas';
import { ClientPlayer } from '../views/Battlefield';
import { Socket } from 'socket.io-client';
import { ExplosionParticleEffect } from './particleEffect';

interface Props {
    client: ClientPlayer
    clientPlayer: React.MutableRefObject<Player | null>
    activePlayer: React.MutableRefObject<Player | null>
    socket: Socket | null
    playerRefs: React.MutableRefObject<Player[]>
    isDrawingBombRef: React.MutableRefObject<boolean>
    explosionParticleEffectRef: React.MutableRefObject<ExplosionParticleEffect | null>
    isActivePlayer: () => boolean
    checkBombEffect: (bombTarget: BombTarget, player: Player, socket: Socket) => void;
    setClientPlayerAngle: React.Dispatch<React.SetStateAction<number>>
    setClientPlayerFiringPower: React.Dispatch<React.SetStateAction<number>>
}

export interface MsgHandler {
    getClientPlayerId: () => number | null;
    isActivePlayer: (playerId: number) => boolean;
    onActivePlayerMoving: () => void;
    onPlayerFall: () => void;
    syncBombDataBeforePlayerFires: (bombsData: Bomb[], isTrident?: boolean) => void;
    addExplosionParticleEffect: (target: Point)=> void
    startExplosionParticleEffect: ()=> void
    checkBombEffects: (bombTarget: BombTarget) => void;
    setActivePlayerAngle: (angle: number) => void;
    resetActivePlayerFiringPower: () => void;
    getIsDrawingBomb: () => boolean;
    setIsDrawingBomb: (isDrawingBomb: boolean) => void;
    startNextTurn: () => void;
}

const getMsgHandler = ({
    client,
    clientPlayer,
    activePlayer,
    socket,
    playerRefs,
    isDrawingBombRef,
    explosionParticleEffectRef,
    isActivePlayer,
    checkBombEffect,
    setClientPlayerAngle,
    setClientPlayerFiringPower
}: Props) => {
    const msgHandler = {
        getClientPlayerId() {
            return client.id;
        },

        isActivePlayer(playerId: number) {
            if(!activePlayer.current) {
                throw new Error("activePlayer is null");
            }

            return activePlayer.current.id === playerId;
        },

        onActivePlayerMoving() {
            if(!socket) {
                throw new Error("socket is null");
            }

            if(!activePlayer.current) {
                throw new Error("activePlayer is null");
            }

            if(isActivePlayer()) {
                socket.emit(
                    "activePlayerMoving",
                    activePlayer.current.centerPoint
                );
            }
        },

        onPlayerFall() {
            if(!socket) {
                throw new Error("socket is null");
            }
            if(!activePlayer.current) {
                throw new Error("activePlayer is null");
            }

            socket.emit(
                "activePlayerFall",
                activePlayer.current.centerPoint
            );
        },

        syncBombDataBeforePlayerFires(bombsData: Bomb[], isTrident?: boolean) {
            if(!socket) {
                throw new Error("socket is null");
            }

            socket.emit("syncBombDataBeforePlayerFires", bombsData, isTrident);
        },

        addExplosionParticleEffect(target: Point) {
            if(!explosionParticleEffectRef.current) {
                throw new Error("explosionParticleEffect is null");
            }

            explosionParticleEffectRef.current.addGroup(target)
        },

        startExplosionParticleEffect() {
            if(!explosionParticleEffectRef.current) {
                throw new Error("explosionParticleEffect is null");
            }

            explosionParticleEffectRef.current.start()
        },

        checkBombEffects(bombTarget: BombTarget) {
            if(!socket) {
                throw new Error("socket is null");
            }

            playerRefs.current.forEach((player) => {
                checkBombEffect(bombTarget, player, socket);
            });
        },

        setActivePlayerAngle(angle: number) {
            // 如果当前clientPlayer 是 activePlayer
            if(!clientPlayer.current) {
                throw new Error("clientPlayer is null");
            }

            if(!activePlayer.current) {
                throw new Error("activePlayer is null");
            }

            if (clientPlayer.current.id === activePlayer.current.id) {
                // 更新 angle状态
                setClientPlayerAngle(angle);
            }
        },

        resetActivePlayerFiringPower() {
            // 重置 this.firingPower
            if (activePlayer.current) {
                activePlayer.current.firingPower = 0;
            }
            if (isActivePlayer()) {
                // 更新页面状态
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
            if (isActivePlayer()) {
                setTimeout(() => {
                    if(!socket) {
                        throw new Error("socket is null");
                    }

                    socket.emit("startNextTurn");
                }, 2000);
            }
        },
    };

    return msgHandler;
};

export default getMsgHandler;