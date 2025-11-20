/**
 * js/state.js
 * Estado global volátil
 */
export const store = {
    userDevices: [],
    userGroups: [],

    setDevices(data) { this.userDevices = data || []; },
    setGroups(data) { this.userGroups = data || []; },

    getDevice(id) { return this.userDevices.find(d => d.id_dispositivo === id); },
    getGroupName(groupId) {
        const group = this.userGroups.find(g => g.id_grupo === groupId);
        return group ? group.nombre_grupo : 'Sin Grupo';
    }
};