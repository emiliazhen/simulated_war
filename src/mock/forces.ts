/// <reference types="vite/client" />
/**
 * Mock 友军 / 敌对目标的态势数据。仅用于 GIS 展示与回放预编排。
 * 不含任何业务语义。
 */

export type Faction = 'friendly' | 'hostile';
export type ForceType = 'SHIP' | 'AIRCRAFT' | 'UAV' | 'GROUND';

export interface ForceState {
  id: string;
  label: string;
  faction: Faction;
  unitType: ForceType;
  /** 初始经度 */
  lng: number;
  /** 初始纬度 */
  lat: number;
  /** 高度（米），飞机/UAV 大于 0 */
  height: number;
  /** 当前生命值 */
  hp: number;
  /** 最大生命值 */
  maxHp: number;
  /** 攻击范围（米） */
  attackRange: number;
  /** 视野范围（米） */
  visionRange: number;
  /** 雷达扫描范围（米） */
  radarRange: number;
  /** 攻击力（每次命中扣除目标 HP） */
  attackPower: number;
  /** 移动速度（米/秒） */
  moveSpeed: number;
  /** 油量（仅供展示） */
  fuel: number;
}

/** 各类型默认参数表 */
export const TYPE_PROFILE: Record<ForceType, Omit<ForceState, 'id' | 'label' | 'faction' | 'unitType' | 'lng' | 'lat'>> & { hp: number } = {
  SHIP: {
    height: 0,
    hp: 1000,
    attackRange: 18000,
    visionRange: 45000,
    radarRange: 60000,
    attackPower: 120,
    moveSpeed: 30,
    fuel: 50000,
  },
  AIRCRAFT: {
    height: 50000,
    hp: 400,
    attackRange: 55000,
    visionRange: 90000,
    radarRange: 110000,
    attackPower: 180,
    moveSpeed: 250,
    fuel: 20000,
  },
  UAV: {
    height: 25000,
    hp: 160,
    attackRange: 35000,
    visionRange: 70000,
    radarRange: 95000,
    attackPower: 90,
    moveSpeed: 180,
    fuel: 8000,
  },
  GROUND: {
    height: 0,
    hp: 600,
    attackRange: 12000,
    visionRange: 25000,
    radarRange: 32000,
    attackPower: 100,
    moveSpeed: 18,
    fuel: 200,
  },
};

let sequence = 0;
const newId = (prefix: string) => `${prefix}-${(sequence++).toString(36).padStart(4, '0')}-${Math.random().toString(36).slice(2, 6)}`;

export function friendlyForces(): ForceState[] {
  return [
    mkForce('friendly', 'SHIP', '舰船-01', 123.567896, 29.287421),
    mkForce('friendly', 'SHIP', '舰船-02', 123.467896, 28.287421),
    mkForce('friendly', 'SHIP', '舰船-03', 123.367896, 28.187421),
    mkForce('friendly', 'SHIP', '舰船-04', 123.267896, 28.287421),
    mkForce('friendly', 'SHIP', '舰船-05', 122.267896, 27.287421),
    mkForce('friendly', 'SHIP', '舰船-06', 122.967896, 27.887421),
    mkForce('friendly', 'AIRCRAFT', '飞机-07', 123.8098234, 24.7894523),
    mkForce('friendly', 'AIRCRAFT', '飞机-08', 123.7098234, 24.6894523),
    mkForce('friendly', 'AIRCRAFT', '飞机-09', 123.9098234, 24.8894523),
    mkForce('friendly', 'UAV', '无人机-10', 124.0098234, 24.7894523),
    mkForce('friendly', 'UAV', '无人机-11', 124.1098234, 24.6894523),
    mkForce('friendly', 'GROUND', '坦克-12', 120.453243, 29.287421),
    mkForce('friendly', 'GROUND', '坦克-13', 120.253243, 29.187421),
    mkForce('friendly', 'GROUND', '坦克-14', 120.353243, 29.287421),
  ];
}

export function hostileForces(): ForceState[] {
  // 敌对部署海区中心：124.85°E, 30.05°N（与 scene.vue 中 hostile beacon 一致）
  return [
    // 海面：在集结海区附近三个不同位置开始巡逻
    mkForce('hostile', 'SHIP', '单位-H01', 124.10, 29.65),
    mkForce('hostile', 'SHIP', '单位-H02', 125.20, 29.85),
    mkForce('hostile', 'SHIP', '单位-H03', 124.65, 30.55),
    // 空中：飞机在集结海区上空盘旋巡逻
    mkForce('hostile', 'AIRCRAFT', '单位-H04', 124.85, 30.05),
    mkForce('hostile', 'AIRCRAFT', '单位-H05', 125.35, 30.45),
    // UAV：靠近集结海区做更广区扫描
    mkForce('hostile', 'UAV', '单位-H06', 124.45, 30.45),
    // 地面：离集结海区较远的岛屿上
    mkForce('hostile', 'GROUND', '单位-H07', 122.253243, 30.287421),
    mkForce('hostile', 'GROUND', '单位-H08', 122.553243, 30.487421),
  ];
}

function mkForce(faction: Faction, type: ForceType, label: string, lng: number, lat: number): ForceState {
  const profile = TYPE_PROFILE[type];
  const prefix = faction === 'friendly' ? 'F' : 'H';
  return {
    id: newId(prefix),
    label,
    faction,
    unitType: type,
    lng,
    lat,
    height: profile.height,
    hp: profile.hp,
    maxHp: profile.hp,
    attackRange: profile.attackRange,
    visionRange: profile.visionRange,
    radarRange: profile.radarRange,
    attackPower: profile.attackPower,
    moveSpeed: profile.moveSpeed,
    fuel: profile.fuel,
  };
}

export function buildForces(): ForceState[] {
  sequence = 0;
  return [...friendlyForces(), ...hostileForces()];
}

/** UI 配色（友军青、敌对橙），不使用红/蓝业务色 */
export const FACTION_THEME: Record<Faction, {
  primary: string;
  labelFill: string;
  ringFill: string;
  ringOutline: string;
}> = {
  friendly: {
    primary: '#00e5ff',
    labelFill: '#00e5ff',
    ringFill: 'rgba(0, 229, 255, 0.08)',
    ringOutline: 'rgba(0, 229, 255, 0.45)',
  },
  hostile: {
    primary: '#ff8a3d',
    labelFill: '#ff8a3d',
    ringFill: 'rgba(255, 138, 61, 0.10)',
    ringOutline: 'rgba(255, 138, 61, 0.45)',
  },
};