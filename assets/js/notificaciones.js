// controllers/notificaciones.js

export class Notificaciones {
    static mostrar(mensaje, tipo = 'info') {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '10000';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'flex-end';
            document.body.appendChild(container);
        }

        const notification = document.createElement('div');
        notification.className = `notification ${tipo}`;

        // Contenedor para el texto y el botón de cierre
        const content = document.createElement('div');
        content.style.display = 'flex';
        content.style.alignItems = 'center';

        const text = document.createElement('span');
        text.textContent = mensaje;

        notification.style.padding = '15px 25px';
        notification.style.margin = '10px 0';
        notification.style.borderRadius = '8px';
        notification.style.color = 'white';
        notification.style.fontFamily = 'Lexend, sans-serif'; // Asegúrate de que esta fuente esté importada si la usas
        notification.style.fontSize = '16px';
        notification.style.fontWeight = '500';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        notification.style.transition = 'all 0.4s ease';
        notification.style.display = 'flex';
        notification.style.alignItems = 'center';
        notification.style.justifyContent = 'space-between';


        const typeStyles = {
            error: { background: '#ff4d4f' },
            success: { background: '#52c41a' },
            warning: { background: '#faad14' },
            info: { background: '#1890ff' }
        };

        Object.assign(notification.style, typeStyles[tipo] || typeStyles.info);

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.marginLeft = '15px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '20px';
        closeBtn.style.lineHeight = '1';

        closeBtn.onclick = () => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (container.contains(notification)) {
                    container.removeChild(notification);
                }
            }, 400);
        };

        notification.appendChild(text);
        notification.appendChild(closeBtn);
        container.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        setTimeout(() => {
            if (notification.parentNode === container) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (container.contains(notification)) {
                        container.removeChild(notification);
                    }
                }, 400);
            }
        }, 5000);
    }
}