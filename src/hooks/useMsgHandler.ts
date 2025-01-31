import { useRef } from 'react';
import { Bomb, BombTarget, Player } from '../libs/player';
import { Point } from '../libs/canvas';
import { ClientPlayer } from '../views/Battlefield';
import { Socket } from 'socket.io-client';
import { ExplosionParticleEffect } from '../libs/particleEffect';

export interface MsgHandler {
    getClientPlayerId: () => string;
    isActivePlayer: (playerId: string) => boolean;
    onPlayerFall: () => void;
    syncBombDataBeforePlayerFires: (bombsData: Bomb[], isTrident?: boolean) => void;
    addExplosionParticleEffect: (target: Point)=> void
    startExplosionParticleEffect: ()=> void
    checkBombEffect: (bombTarget: BombTarget) => void;
    setActivePlayerAngle: (angle: number) => void;
    resetActivePlayerFiringPower: () => void;
    getIsDrawingBomb: () => boolean;
    setIsDrawingBomb: (isDrawingBomb: boolean) => void;
    startNextTurn: () => void;
}

interface Props {
    client: ClientPlayer
    clientPlayer: React.MutableRefObject<Player | null>
    activePlayer: React.MutableRefObject<Player | null>
    socketRef: React.MutableRefObject<Socket | null>
    playerRefs: React.MutableRefObject<Player[]>
    isDrawingBombRef: React.MutableRefObject<boolean>
    explosionParticleEffectRef: React.MutableRefObject<ExplosionParticleEffect | null>
    isActivePlayer: () => boolean
    checkBombEffect: (bombTarget: BombTarget, player: Player) => void;
    setClientPlayerAngle: React.Dispatch<React.SetStateAction<number>>
    setClientPlayerFiringPower: React.Dispatch<React.SetStateAction<number>>
}

const useMsgHandler = ({
    client,
    clientPlayer,
    activePlayer,
    socketRef,
    playerRefs,
    isDrawingBombRef,
    explosionParticleEffectRef,
    isActivePlayer,
    checkBombEffect,
    setClientPlayerAngle,
    setClientPlayerFiringPower
}: Props) => {
    // 每次组件渲染时，自定义 Hook 的逻辑会重新执行，但 useRef 返回的引用 msgHandler 不会重新创建。
    // msgHandler 在组件的整个生命周期内是持久的，不会在每次渲染时重新创建。
    const msgHandler = useRef({
        getClientPlayerId() {
            return client.id;
        },

        isActivePlayer(playerId: string) {
            if(!activePlayer.current) {
                throw new Error("activePlayer is null");
            }

            return activePlayer.current.id === playerId;
        },

        onPlayerFall() {
            if(!socketRef.current) {
                throw new Error("socket is null");
            }
            if(!activePlayer.current) {
                throw new Error("activePlayer is null");
            }

            socketRef.current.emit(
                "activePlayerFall",
                activePlayer.current.centerPoint
            );
        },

        syncBombDataBeforePlayerFires(bombsData: Bomb[], isTrident?: boolean) {
            if(!socketRef.current) {
                throw new Error("socket is null");
            }

            socketRef.current.emit("syncBombDataBeforePlayerFires", bombsData, isTrident);
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

        checkBombEffect(bombTarget: BombTarget) {
            playerRefs.current.forEach((player) => {
                checkBombEffect(bombTarget, player);
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
                    if(!socketRef.current) {
                        throw new Error("socket is null");
                    }

                    socketRef.current.emit("startNextTurn");
                }, 2000);
            }
        },
    });

    return msgHandler;
};

export default useMsgHandler;