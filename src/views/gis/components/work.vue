<template>
  <div class="common-card work-wrap">
    <div class="common-card-title">
      <p>
        单位列表
      </p>
      <svg-icon name="ele-Close" :size="20" @click="closeClick" />
    </div>
    <div class="common-card-content">
      <el-tree style="max-width: 600px" :data="dataList" node-key="id" highlight-current @node-click="nodeClick"
        ref="treeRef">
        <template #default="{ node, data }">
          <div class="tree-item">
            <template v-if="data.isGroup">
              <span class="group-dot" :class="data.faction"></span>
              <span class="group-label">{{ node.label }}</span>
              <span class="group-count">{{ (data.children || []).length }}</span>
            </template>
            <template v-else>
              <span class="unit-dot" :class="data.faction"></span>
              <span class="unit-label">{{ node.label }}</span>
              <!-- 敌对单位：仅作为可见侦察标记，不提供操作按钮、点击不触发选中 -->
              <span v-if="data.faction === 'hostile'" class="hostile-tag">敌对</span>
              <div v-else>
                <svg-icon name="ele-LocationFilled" :size="16" @click.stop="flyToIdClick(data.id)" />
                <el-dropdown trigger="click" placement="bottom-start" @command="command">
                  <svg-icon name="ele-Flag" :size="16" />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="move">移动</el-dropdown-item>
                      <el-dropdown-item command="stop">停止</el-dropdown-item>
                      <el-dropdown-item command="attack">攻击</el-dropdown-item>
                      <el-dropdown-item command="scan">雷达扫描</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </div>
        </template>
      </el-tree>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['close', 'flyToIdClick', 'selectedEntityByIdClick', 'command'])
const closeClick = () => {
  emit('close')
}
const treeRef = ref()
const dataList = inject('dataList')
const flyToIdClick = (id: string) => {
  emit('flyToIdClick', id)
}
const nodeClick = ({ isGroup, id, faction }: { isGroup: boolean, id: string, faction: string }) => {
  if (isGroup) return
  if (faction === 'hostile') {
    // 敌对单位不在界面上选中、不显示框选
    return
  }
  emit('selectedEntityByIdClick', id)
}
const setTreeCheckedKey = (key: string) => {
  treeRef.value?.setCurrentKey(key)
}
const command = (action: string) => {
  emit('command', action)
}
defineExpose({
  setTreeCheckedKey,
})
</script>

<style lang="scss" scoped>
.work-wrap {
  position: absolute;
  top: 80px;
  left: 60px;
  width: 320px;
  height: 700px;
  z-index: 2;

  .common-card-content>div {
    height: 100%;
  }
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: $gray-300;
  width: 100%;

  .group-dot,
  .unit-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;

    &.friendly { background: #00e5ff; box-shadow: 0 0 6px #00e5ff; }
    &.hostile { background: #ff8a3d; box-shadow: 0 0 6px #ff8a3d; }
  }

  .group-label { color: $white; font-weight: 600; }
  .group-count { margin-left: auto; color: rgba($white, 0.5); font-size: 12px; }
  .unit-label { flex: 1; min-width: 0; }
  .hostile-tag {
    margin-left: auto;
    padding: 0 6px;
    height: 18px;
    line-height: 18px;
    font-size: 11px;
    color: #ff8a3d;
    background: rgba(255, 138, 61, 0.12);
    border: 1px solid rgba(255, 138, 61, 0.35);
    border-radius: 9px;
    pointer-events: none;
  }

  >div>i,
  >div>div>i {
    color: #ff9900;
    cursor: pointer;
  }
}
</style>