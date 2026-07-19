// 通用是否枚举
export enum CommonYNEnum {
  no,
  yes,
}
// 参数状态枚举
export enum ParameterStatusEnum {
  normal,
  warning,
  error,
}
// 文件夹类型枚举
export enum ExplorerTypeEnum {
  report = '1',
  knowledge = '2',
}

// 棋子类型
export enum ChessTypeEnum {
  SHIP = 'SHIP',
  SUBMARINE = 'SUBMARINE',
  AIRCRAFT = 'AIRCRAFT',
  HELICOPTER = 'HELICOPTER',
  GROUND = 'GROUND',
  CUSTOM = 'CUSTOM',
}
// 选取坐标点类型
export enum SelectPointEnum {
  trajectory,
  areaPoint,
  area,
}
// 区域类型
export enum AreaTypeEnum {
  Point = '0',
  Line = '1',
  Area = '2',
}
// 绘制形状类型
export enum AreaShapeEnum {
  polygon,
  circle,
}
