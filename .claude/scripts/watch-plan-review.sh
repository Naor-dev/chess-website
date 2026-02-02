#!/bin/bash
# Start watching for plan review feedback in the background
# Usage: ./watch-plan-review.sh [start|stop|status]

PIDFILE="/tmp/plan-review-watcher.pid"
LOGFILE="/tmp/plan-review-watcher.log"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

start_watcher() {
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "⚠️  Watcher already running (PID: $(cat "$PIDFILE"))"
    return 1
  fi

  echo "🚀 Starting plan review watcher..."
  nohup bash "$SCRIPT_DIR/check-plan-review.sh" --watch --interval 60 > "$LOGFILE" 2>&1 &
  echo $! > "$PIDFILE"
  echo "✅ Watcher started (PID: $(cat "$PIDFILE"))"
  echo "   Log: $LOGFILE"
  echo "   Stop with: $0 stop"
}

stop_watcher() {
  if [ ! -f "$PIDFILE" ]; then
    echo "⚠️  No watcher running"
    return 1
  fi

  PID=$(cat "$PIDFILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    rm -f "$PIDFILE"
    echo "✅ Watcher stopped (PID: $PID)"
  else
    rm -f "$PIDFILE"
    echo "⚠️  Watcher was not running (stale PID file removed)"
  fi
}

show_status() {
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "✅ Watcher is running (PID: $(cat "$PIDFILE"))"
    echo ""
    echo "Recent log:"
    tail -20 "$LOGFILE" 2>/dev/null || echo "(no log yet)"
  else
    echo "⏹️  Watcher is not running"
  fi
}

show_log() {
  if [ -f "$LOGFILE" ]; then
    tail -f "$LOGFILE"
  else
    echo "No log file found"
  fi
}

case "${1:-status}" in
  start)
    start_watcher
    ;;
  stop)
    stop_watcher
    ;;
  status)
    show_status
    ;;
  log)
    show_log
    ;;
  *)
    echo "Usage: $0 [start|stop|status|log]"
    exit 1
    ;;
esac
