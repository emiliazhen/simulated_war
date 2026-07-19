// 系统管理员角色 ID
export const ADMIN_ROLE_ID = '1'

// 判断此id是否为管理员
export const isAdmin = (id: string) => {
    if (id === ADMIN_ROLE_ID) {
        return true
    }
    return false
}