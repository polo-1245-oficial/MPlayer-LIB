const { spawn, exec } = require('child_process');
const readline = require('readline');

class MPlayer {
    constructor() {
        this.mplayer = null;
        this.rl = null;
        this.file = null;
    }

    play(file) {
        this.file = file;
        this.mplayer = spawn('mplayer', ['-slave', '-quiet', file], {
            stdio: ['pipe', 'pipe', 'ignore']
        });
        this.rl = readline.createInterface({
            input: this.mplayer.stdout,
            output: null
        });

        this.mplayer.on('exit', (code) => {
            console.log(`MPlayer exited with code ${code}`);
        });

        this.rl.on('line', (line) => {
            this.handleLine(line);
        });
    }

    stop() {
        if (this.mplayer) {
            this.mplayer.stdin.write('quit\n');
            this.mplayer = null;
            this.rl.close();
            this.rl = null;
        }
    }

    pause() {
        if (this.mplayer) {
            this.mplayer.stdin.write('pause\n');
        }
    }

    seek(seconds) {
        if (this.mplayer) {
            this.mplayer.stdin.write(`seek ${seconds} 0\n`);
        }
    }

    handleLine(line) {
        if (this.lineHandler) {
            this.lineHandler(line);
        }
    }

    getTimeRemaining(callback) {
        if (this.mplayer) {
            this.lineHandler = (line) => {
                if (line.startsWith('ANS_TIME_POSITION')) {
                    const currentTime = parseFloat(line.split('=')[1]);
                    this.mplayer.stdin.write('get_time_length\n');
                    this.lineHandler = (line) => {
                        if (line.startsWith('ANS_LENGTH')) {
                            const length = parseFloat(line.split('=')[1]);
                            const timeRemaining = length - currentTime;
                            callback(timeRemaining);
                            this.lineHandler = null;
                        }
                    };
                }
            };
            this.mplayer.stdin.write('get_time_pos\n');
        }
    }

    getTitle(callback) {
        if (!this.file) {
            callback('');
            return;
        }

        exec(`ffprobe -v quiet -show_entries format_tags=title -of default=noprint_wrappers=1:nokey=1 "${this.file}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                callback('');
                return;
            }
            const title = stdout.trim();
            callback(title);
        });
    }

    setVolume(volume) {
        if (this.mplayer) {
            this.mplayer.stdin.write(`volume ${volume} 1\n`);
        }
    }

    increaseVolume(amount) {
        if (this.mplayer) {
            this.mplayer.stdin.write(`volume ${amount} 1\n`);
        }
    }

    decreaseVolume(amount) {
        if (this.mplayer) {
            this.mplayer.stdin.write(`volume -${amount} 1\n`);
        }
    }
}

module.exports = MPlayer;
