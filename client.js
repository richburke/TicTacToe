
/**
 * make stop work
 *   - add continue
 * fix reset(?)
 * log result if CvC registers a win
 * log result if P in PvC registers a win
 *
 * add games
 *  * in PvC, save moves
 * add win percentage
 * add readme
 * resolve memory leak
 * clean up
 *
 * save & create branch
 *   - AI
 *   - Multi-player (Node)
 *   - Angular
 * set mode (PvP, CvP, CvC)
 */

Math.randomInt = Math.randomInt || function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

var $a;
(function() {
  $a = function() {
    var ee = new EventEmitter();
    var mode = 'pvc';
    var started = false;

    var board = boardFnc();
    var game = gameFnc();
    var ai = aiFnc();
    var view = viewFnc();

    return {
      init: function() {
        game.init();
        ai.init();
        board.init();
        view.init();

        board.draw();

        ee.on('game-start', function(e) {view.handleEvent(e);});
        ee.on('game-reset', function(e) {game.handleEvent(e);});
        ee.on('game-reset', function(e) {board.handleEvent(e);});
        ee.on('game-reset', function(e) {view.handleEvent(e);});
        ee.on('game-over', function(e) {view.handleEvent(e);});
        ee.on('play-again', function(e) {game.handleEvent(e);});
        ee.on('play-again', function(e) {board.handleEvent(e);});
        ee.on('activate-cell', function(e) {game.handleEvent(e);});
        ee.on('click-cell', function(e) {game.handleEvent(e);});
        ee.on('click-start', function(e) {game.handleEvent(e);});
        ee.on('cmd.make-move', function(e) {ai.handleEvent(e);});
      },
      getGame: function() {
        return game;
      },
      getBoard: function() {
        return board;
      },
      getView: function() {
        return view;
      },
      getMode: function() {
        return mode;
      },
      setMode: function(v) {
        mode = v;
      },
      handleEvent: function(e) {
        switch (e.event) {
          case 'game-start':
            ee.trigger(e.event, [e]);
            break;

          case 'click-cell':
            ee.trigger('click-cell', [{event:'click-cell', payload: {}, message: ''}]);
          case 'activate-cell':
            ee.trigger('activate-cell', [{event:'activate-cell', payload: {cell: e.payload.cell}, message: ''}]);
            break;

          case 'click-start':
            ee.trigger('game-start', [e]);

            if (this.getMode() === 'cvc') {
              ee.trigger('cmd.make-move', [{event:'cmd.make-move', payload: {}, message: ''}]);
            }
            break;

          case 'click-game-reset':
            started = false;
            ee.trigger('game-reset', [e]);
            break;

          case 'click-play-again':
            ee.trigger('play-again', [e]);
            break;

          case 'first-cell-activated':
            // In PvC mode, the click on the first cell signifies the start of
            // the game.  In CvC mode, the game will have been started via a
            // click on the "Start Game" button.
            if (started) {
              return;
            }
            ee.trigger('game-start', [{event:'game-start', payload: {cell: e.payload.cell}, message: ''}]);
            break;

          case 'game-turn-done':
            if (this.getMode() === 'cvc') {
              setTimeout(function() {
                ee.trigger('cmd.make-move', [{event:'cmd.make-move', payload: {}, message: ''}]);
              }, 1000);
            }
            else {
              if (e.payload.player_done == 'x') {
                setTimeout(function() {
                  ee.trigger('cmd.make-move', [{event:'cmd.make-move', payload: {}, message: ''}]);
                }, 500);
              }
            }
            break;

          case 'game-over':
            var msg = 'The game ended in a tie.';
            if (e.payload.winner !== 'tie') {
              msg = e.payload.winner.toUpperCase() + ' wins!';
            }
            ee.trigger('game-over', [{event:'game-over', payload: {winner: e.payload.winner}, message: msg}]);

            if (this.getMode() === 'cvc') {
              setTimeout(function() {
                ee.trigger('game-reset', [{event:'game-reset', payload: {}, message: ''}]);
                ee.trigger('cmd.make-move', [{event:'cmd.make-move', payload: {}, message: ''}]);
              }, 3000);
            }
            break;
        }
      }
    }
  }();

  function gameFnc() {
    var ee = new EventEmitter();
    var cells = [];
    var winningCombinations = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    var players = [];
    var state = {
      round: 0,
      turn: 0,
      current_player: '',
      moves: []
    };

    function clearCells() {
      cells = [null, null, null,
        null, null, null,
        null, null, null];
    }

    return {
      init: function() {
        ee.on('activate-cell', function(e) {$a.getBoard().handleEvent(e);});
        ee.on('first-cell-activated', function(e) {$a.handleEvent(e);});
        ee.on('game-over', function(e) {$a.handleEvent(e);});
        ee.on('game-turn-done', function(e) {$a.handleEvent(e);});

        clearCells();
      },
      reset: function() {
        clearCells();

        state.round = 0;
        state.turn = 0;
        state.current_player = '';
        state.moves = [];
      },
      getCurrentPlayer: function() {
        return state.current_player;
      },
      getOpposingPlayer: function() {
        return state.current_player == 'x' ? 'o' : 'x';
      },
      getCurrentTurn: function() {
        return state.turn;
      },
      isWin: function() {
        var result = {game_over: false, winner: ''};

        winningCombinations.forEach(function(combo) {
          var i;
          var test = cells[combo[0]];

          if (test == null) {
            return;
          }
          if (result.game_over) {
            return;
          }

          for (i=1; i < combo.length; i++) {
            if (cells[combo[i]] != test) {
              return;
            }
          }
          result.game_over = true;
          result.winner = test;
        });

        if (!result.game_over && this.isBoardFull()) {
          result.game_over = true;
          result.winner = 'tie';
        }

        return result;
      },
      isBoardFull: function() {
        for (var i=0; i < cells.length; i++) {
          if (cells[i] == null) {
            return false;
          }
        }
        return true;
      },
      getCellValue: function(i) {
        return cells[i];
      },
      setCellValue: function(i, v) {
        cells[i] = v;
        state.moves.push(i);
        return cells[i];
      },
      getMoveOnTurn: function(turn) {
        return state.moves[turn - 1];
      },
      getCells: function(type) {
        if (typeof type == 'undefined' || typeof type.category == 'undefined') {
          return cells;
        }

        var result;
        switch (type.category) {
          case 'center':
            return [4];

          case 'corners':
            return [0, 2, 6, 8];

          case 'diagonals':
            result = {
              left: [0, 4, 8],
              right: [2, 4, 6]
            };
            if (typeof type.sub_category == 'undefined') {
              return result;
            }
            return result[type.sub_category];

          case 'rows':
          result = {
            0: [0, 1, 2],
            1: [3, 4, 5],
            2: [6, 7, 8]
          };
          if (typeof type.sub_category == 'undefined') {
            return result;
          }
          return result[type.sub_category];

          case 'columns':
            result = {
              0: [0, 3, 6],
              1: [1, 4, 7],
              2: [2, 5, 8]
            };
            if (typeof type.sub_category == 'undefined') {
              return result;
            }
            return result[type.sub_category];

          case 'boundaries':
            result = {
              n: [0, 1, 2],
              e: [2, 5, 8],
              s: [6, 7, 8],
              w: [0, 3, 6]
            };
            if (typeof type.sub_category == 'undefined') {
              return result;
            }
            return result[type.sub_category];
        }

        return cells;
      },
      isCellInDiagonal: function(cell, type) {
        var i;
        var diagonals = this.getCells({category: 'diagonals', sub_category: type});

        for (i = 0; i < diagonals.length; i++) {
          if (diagonals[i] == cell) {
            return true;
          }
        }

        return false;
      },
      getCellInDiagonal: function(cell, type) {
        if (this.isCellInDiagonal(cell, type)) {
          return this.getCells({category: 'diagonals', sub_category: type});
        }
        return [];
      },
      getCellIn: function(cell, type) {
        var container = this.getCells({category: type});
        var keys = Object.keys(container);
        var i;

        for (i = 0; i < keys.length; i++) {
          if (container[keys[i]].indexOf(cell) !== -1) {
            return container[keys[i]];
          }
        }

        return [];
      },
      getCellRow: function(cell) {
        return this.getCellIn(cell, 'rows');
      },
      getCellColumn: function(cell) {
        return this.getCellIn(cell, 'columns');
      },
      getNumberOfCellsActivated: function() {
        var filled = 0;
        cells.forEach(function(v) {
          if (v != null) {
            filled++;
          }
        });
        return filled;
      },
      doTurnStart: function() {
        state.current_player = state.current_player == 'x' ? 'o' : 'x';
        state.turn++;
      },
      doTurnDone: function(is_win) {
        if (!is_win) {
          ee.trigger('game-turn-done', [{event:'game-turn-done', payload: {player_done:state.current_player}, message: ''}]);
        }
      },
      handleEvent: function(e) {
        switch (e.event) {
          case 'click-cell':
            this.doTurnStart();
            break;

          case 'activate-cell':
            // We need to let the game handle the state...
            this.setCellValue(e.payload.cell, this.getCurrentPlayer());
            // ... and then we can let the board draw itself.
            ee.trigger('activate-cell', [e]);

            if (this.getNumberOfCellsActivated() == 1) {
              ee.trigger('first-cell-activated', [{event:'first-cell-activated', payload: {cell: e.payload.cell}, message: ''}]);
            }

            var result = this.isWin();
            if (result.game_over) {
              ee.trigger('game-over', [{event:'game-over', payload: {winner: result.winner}, message: ''}]);
            }
            this.doTurnDone(result.game_over);
            break;

          case 'calculating-move':
            this.doTurnStart();
            break;

          case 'game-reset':
            this.reset();
            break;
        }
      }
    };
  }

  function aiFnc() {
    var ee = new EventEmitter();
    var random = {x: 0, o: 0};

    function getGame() {
      return $a.getGame();
    }
    function findPossibleMoves() {
      var moves = [];
      $a.getGame().getCells().forEach(function(v, i) {
        if (v == null) {
          moves.push(i);
        }
      });
      return moves;
    }
    function numberOfMatches(a, match) {
      var game = getGame();
      var count = 0;

      a.forEach(function(v) {
        if (match === getGame().getCellValue(v)) {
          count = count + 1;
        }
      });

      return count;
    }
    function rateMoves(moves) {
      var game = getGame();
      var player = game.getCurrentPlayer();
      var opposing_player = game.getOpposingPlayer();
      var rated_moves = [];
      var option, row, column, diagonal_left, diagonal_right, modifier;

      moves.forEach(function(cell) {
        option = {cell: cell, score: 0};

        row = game.getCellRow(cell);
        column = game.getCellColumn(cell);
        diagonal_left = game.getCellInDiagonal(cell, 'left');
        diagonal_right = game.getCellInDiagonal(cell, 'right');

        // If 2 other cells in <dimension> are ours, add 20
        modifier = 20;
        if (numberOfMatches(row, player) > 1) {
          option.score = option.score + modifier;
        }
        if (numberOfMatches(column, player) > 1) {
          option.score = option.score + modifier;
        }
        if (numberOfMatches(diagonal_left, player) > 1) {
          option.score = option.score + modifier;
        }
        if (numberOfMatches(diagonal_right, player) > 1) {
          option.score = option.score + modifier;
        }

        // If 2 other cells in <dimension> are theirs, add 10
        modifier = 10;
        if (numberOfMatches(row, opposing_player) > 1) {
          option.score = option.score + modifier;
        }
        if (numberOfMatches(column, opposing_player) > 1) {
          option.score = option.score + modifier;
        }
        if (numberOfMatches(diagonal_left, opposing_player) > 1) {
          option.score = option.score + modifier;
        }
        if (numberOfMatches(diagonal_right, opposing_player) > 1) {
          option.score = option.score + modifier;
        }

        // If 1 other cell in the <dimension> is theirs and we don't have an
        // offset for that, add 4
        modifier = 4;
        if (numberOfMatches(row, opposing_player) == 1 && numberOfMatches(row, player) == 0) {
            option.score = option.score + modifier;
        }
        if (numberOfMatches(column, opposing_player) == 1 && numberOfMatches(column, player) == 0) {
          option.score = option.score + modifier;
        }
        if (numberOfMatches(diagonal_left, opposing_player) == 1 && numberOfMatches(diagonal_left, player) == 0) {
          option.score = option.score + modifier;
        }
        if (numberOfMatches(diagonal_right, opposing_player) == 1 && numberOfMatches(diagonal_right, player) == 0) {
          option.score = option.score + modifier;
        }

        // If 1 other cell in the <dimension> is ours, add 2
        modifier = 2;
        if (numberOfMatches(row, player) == 1) {
          option.score = option.score + modifier;
        }
        if (numberOfMatches(column, player) == 1) {
          option.score = option.score + modifier;
        }
        if (numberOfMatches(diagonal_left, player) == 1) {
          option.score = option.score + modifier;
        }
        if (numberOfMatches(diagonal_right, player) == 1) {
          option.score = option.score + modifier;
        }

        // If the other cells in row are empty, add 1
        modifier = 1;
        if (numberOfMatches(row, player) == 0 && numberOfMatches(row, opposing_player) ) {
          option.score = option.score + modifier;
        }
        if (numberOfMatches(column, player) == 0 && numberOfMatches(column, opposing_player) ) {
          option.score = option.score + modifier;
        }
        if (numberOfMatches(diagonal_left, player) == 0 && numberOfMatches(diagonal_left, opposing_player) ) {
          option.score = option.score + modifier;
        }
        if (numberOfMatches(diagonal_right, player) == 0 && numberOfMatches(diagonal_right, opposing_player) ) {
          option.score = option.score + modifier;
        }

        rated_moves.push(option);
      });

      return rated_moves;
    }
    function determineBestMove() {
      var game = getGame();
      var turn = game.getCurrentTurn();
      var options, high_score, move, i;
      var highest = [];

      if (turn == 1) {
        options = game.getCells({category:'corners'});
        return options[Math.randomInt(0, options.length - 1)];
      }

      options = findPossibleMoves();
      if (turn == 2) {
        // Get the index of the first move.
        move = game.getMoveOnTurn(turn - 1);
        // If it's on a corner, choose the middle.
        if (game.getCells({category:'corners'}).indexOf(move) !== -1) {
          return game.getCells({category:'center'});
        }
        // If it's in the middle, choose one of the corners.
        if (game.getCells({category:'center'}).indexOf(move) !== -1) {
          options = game.getCells({category:'corners'});
          return options[Math.randomInt(0, options.length - 1)];
        }
      }

      // Sort highest to lowest
      options = rateMoves(options).sort(function(a, b) {
        if (a.score > b.score) {
          return -1;
        }
        if (a.score < b.score) {
          return 1;
        }
        return 0;
      });

      // Grab all the options with the highest values, and then take a random.
      high_score = options[0].score;
      for (i = 0; i < options.length; i++) {
        if (options[i].score != high_score) break;
        highest.push(options[i].cell);
      }

      return highest[Math.randomInt(0, highest.length - 1)];
    }
    function makeMove() {
      ee.trigger('calculating-move', [{event:'calculating-move', payload: {}, message: ''}]);
      var move = determineBestMove();
      ee.trigger('activate-cell', [{event:'activate-cell', payload: {cell: move}, message: ''}]);
    }

    return {
      init: function() {
        ee.on('calculating-move', function(e) {$a.getGame().handleEvent(e);});
        ee.on('activate-cell', function(e) {$a.handleEvent(e);});
      },
      handleEvent: function(e) {
        switch (e.event) {
          case 'cmd.make-move':
            makeMove();
            break;
        }
      }
    }
  }

  function boardFnc() {
    var ee = new EventEmitter();
    var cnvs, ctx, clickableRegions;

    function drawMark(region) {
      var g = $a.getGame();
      var player = g.getCurrentPlayer();
      if (player == 'x') {
        drawCross(region);
      }
      if (player == 'o') {
        drawNaught(region);
      }
    }
    function drawCross(region) {
      ctx.beginPath();
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'black';

      ctx.moveTo(region.x + 12, region.y + 12);
      ctx.lineTo(region.x + region.width - 12, region.y + region.height - 12);
      ctx.moveTo(region.x + region.width - 12, region.y + 12);
      ctx.lineTo(region.x + 12, region.y + region.height - 12);

      ctx.stroke();
    }
    function drawNaught(region) {
      var xCenter = region.x + Math.floor(region.width / 2);
      var yCenter = region.y + Math.floor(region.height / 2);
      var radius = (region.width - 24) / 2;

      ctx.beginPath();
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'black';
      ctx.arc(xCenter, yCenter, radius, 0, 2 * Math.PI, false);
      ctx.stroke();
    }
    function reset() {
      clickableRegions.forEach(function(v) {
        ctx.clearRect(v.x + 1, v.y + 1, v.width - 1, v.height - 1);
      });
    }

    return {
      init: function() {
        var self = this;

        ee.on('click-cell', function(e) {$a.handleEvent(e);});

        cnvs = document.getElementById("board");
        ctx = cnvs.getContext('2d');
        clickableRegions = [];

        var onClick = function (e) {
          // Don't recognize clicks during Computer vs. Computer mode.
          if ($a.getMode() === 'cvc') {
            return;
          }

          var clickedX = e.pageX - this.offsetLeft;
          var clickedY = e.pageY - this.offsetTop;

          self.handleClick(clickedX, clickedY);
        };
        cnvs.addEventListener("click", onClick, false);

        clickableRegions.push({x:0, y:0, width:59, height:59});
        clickableRegions.push({x:60, y:0, width:59, height:59});
        clickableRegions.push({x:120, y:0, width:59, height:59});

        clickableRegions.push({x:0, y:60, width:59, height:59});
        clickableRegions.push({x:60, y:60, width:59, height:59});
        clickableRegions.push({x:120, y:60, width:59, height:59});

        clickableRegions.push({x:0, y:120, width:59, height:59});
        clickableRegions.push({x:60, y:120, width:59, height:59});
        clickableRegions.push({x:120, y:120, width:59, height:59});
      },
      draw: function() {
        ctx.strokeStyle = '#999999';

        ctx.beginPath();
        ctx.moveTo(60, 0);
        ctx.lineTo(60, 180);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.moveTo(120, 0);
        ctx.lineTo(120, 180);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.moveTo(0, 60);
        ctx.lineTo(180, 60);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.moveTo(0, 120);
        ctx.lineTo(180, 120);
        ctx.stroke();
        ctx.closePath();
      },
      getRegionByCell: function(cell) {
        return clickableRegions[cell];
      },
      handleClick: function(x, y) {
        var i, region;

        // If outside boundaries, do nothing
        if (x < 0 || x > 180 || y < 0 || y > 180) {
          return false;
        }

        /**
         * @todo
         * Can I make it so board doesn't have a dependency on game?
         */
        var g = $a.getGame();
        for (i=0; i < clickableRegions.length; i++) {
          if (g.getCellValue(i) !== null) {
            continue;
          }

          region = this.getRegionByCell(i);
          if (x < region.x || x > region.x + region.width) {
            continue;
          }
          if (y < region.y || y > region.y + region.height) {
            continue;
          }

          ee.trigger('click-cell', [{event:'click-cell', payload: {cell: i}, message: ''}]);
          return true;
        }
        return false;
      },
      handleEvent: function(e) {
        switch (e.event) {
          case 'play-again':
            reset();
            break;

          case 'game-reset':
            reset();
            break;

          case 'activate-cell':
            drawMark(this.getRegionByCell(e.payload.cell));
            break;
        }
      }
    }
  }

  function viewFnc() {
    var ee = new EventEmitter();
    var cmdBtn, result, mode;

    function displayWin(msg, winner) {
      var field = document.getElementById(winner + '_score');
      var val = field.innerHTML;
      if (val == '' || val == '&nbsp;') {
        val = 0;
      }
      else {
        val = parseInt(val);
      }
      val = val + 1;

      field.innerHTML = val;
      result.innerHTML = msg;
    }
    function clearResult() {
      result.innerHTML = '&nbsp;';
    }
    function enableCmdBtn() {
      cmdBtn.disabled = false;
      cmdBtn.className = '';
    }
    function disableCmdBtn() {
      cmdBtn.disabled = true;
      cmdBtn.className = 'disabled';
    }
    function resetCmdBtn(mode) {
      if (mode === 'cvc') {
        cmdBtn.innerHTML = 'Start';
        cmdBtn.action = 'start';
        enableCmdBtn();
      }
      else {
        cmdBtn.innerHTML = '&mdash;';
        cmdBtn.action = '';
        disableCmdBtn();
      }
    }

    return {
      init: function() {
        var self = this;

        ee.on('mode-change', function(e) {self.handleEvent(e);});
        ee.on('click-play-again', function(e) {$a.handleEvent(e);});
        ee.on('click-reset', function(e) {$a.handleEvent(e);});
        ee.on('click-start', function(e) {$a.handleEvent(e);});

        result = document.getElementById('result');
        mode = document.getElementsByName('mode');

        cmdBtn = document.getElementById('cmd');
        disableCmdBtn();

        var onBtnClick = function (e) {
          switch (e.target.action) {
            case 'start':
              resetCmdBtn($a.getMode());
              ee.trigger('click-start', [{event:'click-start', payload: {}, message: ''}]);
              break;

            case 'stop':
              break;

            case 'reset':
              clearResult();
              resetCmdBtn($a.getMode());
              disableCmdBtn();

              ee.trigger('click-reset', [{event:'game-reset', payload: {}, message: ''}]);
              break;

            case 'play_again':
              clearResult();
              resetCmdBtn($a.getMode());
              disableCmdBtn();

              ee.trigger('click-play-again', [{event:'play-again', payload: {}, message: ''}]);
              break;
          }

          /**
           * get the mode
           *
           * set an action value
           *
           * if the inner html == Play Again,
           *   -b -> clear board
           * if the inner html == Start
           *   -g -> start game
           * if the inner html == Stop
           *   -g -> stop
           */

          console.dir(e);
        };
        cmdBtn.addEventListener("click", onBtnClick, false);

        var onModeClick = function (e) {
          ee.trigger('mode-change', [{event:'mode-change', payload: {target: e.target}, message: ''}]);
        };

        for (var i=0; i < mode.length; i++) {
          mode[i].addEventListener("click", onModeClick, false);
        }
      },
      handleEvent: function(e) {
        var val;

        switch (e.event) {
          case 'game-over':
            displayWin(e.message, e.payload.winner);
            enableCmdBtn();
            break;

          case 'mode-change':
            $a.setMode(e.payload.target.value);
            resetCmdBtn($a.getMode());
            break;

          case 'game-start':
            val = $a.getMode();

            if (val === 'cvc') {
              cmdBtn.innerHTML = 'Stop';
              cmdBtn.action = 'stop';
            }
            else {
              cmdBtn.innerHTML = 'Reset';
              cmdBtn.action = 'reset';
              enableCmdBtn();
            }
            // Disable mode
            break;

          case 'game-reset':
            clearResult();
        }
      }
    }
  }

  $a.init();
})();
