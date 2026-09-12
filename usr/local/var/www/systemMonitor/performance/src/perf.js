var TimingGrid = React.createClass({
    getInitialState: function () {

        this.socket = new WebSocket("ws://"+window.location.host+"/perflog");
        this.socket.addEventListener('message', this.onMessage);
        return {
            entries: []
        };
    },
    onMessage: function (message) {
        var entry = JSON.parse(message.data);
        if (!this.startTime) {
            this.startTime = entry.time;
        }
        this.state.entries.push(entry);
        this.setState({
            entries: this.state.entries
        });
    },
    format: function (value, length) {
        var ret = String(value);
        while (ret.length < length) {
            ret = "0" + ret;
        }
        return ret;
    },
    render: function () {
        var _this = this;
        var rows = [];
        this.state.entries.forEach(function (entry, i) {
            var date = new Date(entry.time);
            var hours = _this.format(date.getHours(), 2);
            var minutes = _this.format(date.getMinutes(), 2);
            var seconds = _this.format(date.getSeconds(), 2);
            var ms = _this.format(date.getMilliseconds(), 3);
            var time = hours + ":" + minutes + ":" + seconds + ":" + ms;
            rows.push(React.createElement("tr", {key: i}, 
                React.createElement("td", {className: "time"}, 
                    React.createElement("samp", null, time)
                ), 
                React.createElement("td", {className: "type"}, 
                    React.createElement("code", null, entry.type)
                ), 
                React.createElement("td", {className: "desc"}, entry.description)));
        });
        return React.createElement("table", {className: "table table-striped table-condensed"}, 
            React.createElement("thead", null, 
                React.createElement("tr", null, 
                    React.createElement("th", {className: "time"}, "Time"), 
                    React.createElement("th", {className: "type"}, "Type"), 
                    React.createElement("th", {className: "desc"}, "Description"))
            ), 
            React.createElement("tbody", null, rows));
    }
});
$(document).ready(function () {
    ReactDOM.render(React.createElement(TimingGrid, null), document.getElementById('grid'));
});
