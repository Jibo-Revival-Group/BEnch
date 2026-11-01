'use strict';
// Jibo's media sync must keep this robot's photos when the cloud list leaves them out (5x1's
// media list request carries no robot identity, so it is always empty), and still drop photos
// deleted on the robot. Runs SSM's real _applyMediaChanges against small fakes.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const file = process.argv[2] ||
    path.join(__dirname, '../usr/local/bin/jibo-ssm/lib/skills-service-manager.js');
const src = fs.readFileSync(file, 'utf8');
const start = src.indexOf('    _applyMediaChanges(cloudMediaList, callback) {');
const end = src.indexOf('    _applyCloudMediaToLocalMedia(cloudMedia, localMediaNode) {', start);
assert(start > 0 && end > start, 'found _applyMediaChanges');
const log = { info() {}, warn() {}, iferr() {} };
const MediaSync = new Function('log', 'return class {' + src.slice(start, end) + '};')(log);

function rootNode(edges) {
    return {
        edges: edges,
        getEdges(name) { return (this.edges[name] || []).slice(); },
        addEdges(ids, name) { this.edges[name] = (this.edges[name] || []).concat(ids); },
        removeEdges(ids, name) { this.edges[name] = (this.edges[name] || []).filter(id => ids.indexOf(id) < 0); }
    };
}

const removed = [];
const node = (id, data) => ({ _id: id, data: data, remove() { removed.push(id); return Promise.resolve(); } });
const photo = node('new-photo', { type: 'image', isDeleted: false });
const thumb = node('new-thumb', { type: 'thumb', reference: 'new-photo', isDeleted: false });
const gone = node('deleted-photo', { type: 'image', isDeleted: true });
const nodes = { 'new-photo': photo, 'new-thumb': thumb, 'deleted-photo': gone };

const sync = new MediaSync();
sync.rootNode = rootNode({ media: ['new-photo', 'new-thumb', 'deleted-photo'], 'pending-upload': [], 'pending-delete': [] });
sync.model = {
    load(ids, cb) { cb(); },
    fetch(id) { return nodes[id]; },
    saveLayers(root, name, cb) { cb(); }
};
sync._fetchMedia = () => sync.rootNode.getEdges('media').map(id => nodes[id]);
sync._setupThumbnailEdges = () => false;
sync._applyCloudMediaToLocalMedia = () => false;

sync._applyMediaChanges([], () => {
    setImmediate(() => {
        assert.deepStrictEqual(sync.rootNode.getEdges('media').sort(), ['new-photo', 'new-thumb'],
            'the new photo and its thumbnail stay in Jibo\'s media list');
        assert.deepStrictEqual(removed, ['deleted-photo'], 'only the photo deleted on the robot is removed');
        console.log('Media sync keeps new photos missing from the cloud list and drops deleted ones');
    });
});
