
module.exports = class Clients {
    constructor() {
        this.clients = [];
    }

    addClient(client) {
        let serverClient = this.clients.find(c => c.username === client.username);
        if(serverClient){
            console.log('Updating client info for player: ' + client.username);
            console.log('- Token before: ' + serverClient.token);
            serverClient = client;
            console.log('- Token after: ' + serverClient.token);
        }
        else{
            console.log('Adding client for new player: ' + client.username);
            this.clients.push(client);
        }
    }

    getClient(token) {
        const client = this.clients.find(c => c.token === token);
        if(client){
            return client;
        }
        console.error('No client found for token: ' + token);
        return null;
    }

    getClientName(token) {
        if(this.getClient(token)) {
            return this.getClient(token).username;
        }
        return null;
    }

    removeClient(token) {
        const index = this.clients.findIndex(c => c.token === token);
        if(index > -1){
            const serverClient = this.clients[index];
            console.log('Removing client for player: ' + serverClient.username);
            this.clients.splice(index, 1);
        }
        else{
            console.error('No client found for token: ' + token);
        }
    }
}