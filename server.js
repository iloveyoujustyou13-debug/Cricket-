const { WebSocketServer } = require('ws');
// Render.com-এর পোর্ট ডিটেকশন লজিক অ্যাড করা হয়েছে
const PORT = process.env.PORT || 5000; 
const wss = new WebSocketServer({ port: PORT });

let studioClient = null;
let activeCameras = {};

console.log(`CBP WebRTC Signaling Core successfully started on port ${PORT}`);

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            return console.log("Invalid JSON received");
        }
        
        switch (data.type) {
            case 'register_studio':
                studioClient = ws;
                console.log("Studio Master Control Panel Connected System-wide.");
                break;
                
            case 'register_camera':
                ws.cameraId = data.cameraId;
                activeCameras[data.cameraId] = ws;
                console.log(`Camera active stream pipeline registered: ${data.cameraId}`);
                break;
                
            case 'offer':
                if (studioClient && studioClient.readyState === 1) {
                    studioClient.send(JSON.stringify({ type: 'offer', cameraId: data.cameraId, offer: data.offer }));
                }
                break;
                
            case 'answer':
                if (activeCameras[data.targetId] && activeCameras[data.targetId].readyState === 1) {
                    activeCameras[data.targetId].send(JSON.stringify({ type: 'answer', answer: data.answer }));
                }
                break;
                
            case 'ice-candidate':
                if (data.targetId && activeCameras[data.targetId] && activeCameras[data.targetId].readyState === 1) {
                    activeCameras[data.targetId].send(JSON.stringify({ type: 'ice-candidate', candidate: data.candidate }));
                } else if (studioClient && studioClient.readyState === 1) {
                    studioClient.send(JSON.stringify({ type: 'ice-candidate', cameraId: ws.cameraId, candidate: data.candidate }));
                }
                break;
        }
    });

    ws.on('close', () => {
        if (ws.cameraId && activeCameras[ws.cameraId]) {
            delete activeCameras[ws.cameraId];
            console.log(`Camera connection severed cleanly: ${ws.cameraId}`);
            if (studioClient && studioClient.readyState === 1) {
                studioClient.send(JSON.stringify({ type: 'disconnect', cameraId: ws.cameraId }));
            }
        }
    });
});

