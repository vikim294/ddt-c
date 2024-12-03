import { Point } from "../libs/canvas"

export function angleToRadian(angle: number) {
  return Math.PI / 180 * angle
}

/**
 * 计算两点之间的距离
 */
export function getDistanceBetweenTwoPoints(pointA: Point, pointB: Point) {
  const dy = pointB.y - pointA.y
  const dx = pointB.x - pointA.x
  return Math.sqrt(dy * dy + dx * dx)
}