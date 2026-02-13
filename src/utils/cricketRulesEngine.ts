/**
 * Cricket Rules Engine - Frontend
 * Single source of truth for state replay
 * Identical logic to backend
 */

export type ExtraType = 'none' | 'wide' | 'no-ball' | 'bye' | 'leg-bye';
export type WicketType = 'bowled' | 'lbw' | 'caught' | 'stumped' | 'run-out' | 'hit-wicket';

export interface BallRecord {
  batsmanId: string;
  bowlerId: string;
  runs: number;
  extraRuns: number;
  extras: ExtraType;
  isWicket: boolean;
  wicketType?: WicketType;
}

export interface MatchState {
  striker: string;
  nonStriker: string;
  bowler: string;
  over: number;
  ballInOver: number;
  legalBallsInOver: number;
}

/**
 * Is this a legal delivery?
 */
export function isLegal(extras: ExtraType): boolean {
  return extras === 'none' || extras === 'bye' || extras === 'leg-bye';
}

/**
 * Get total runs from a ball
 */
function getTotalRuns(ball: BallRecord): number {
  return ball.runs + ball.extraRuns;
}

/**
 * Apply a single ball to match state
 */
export function applyBall(
  state: MatchState,
  ball: BallRecord,
  getNextBatsman: () => string | null
): MatchState {
  let { striker, nonStriker, bowler, over, legalBallsInOver } = state;
  const legal = isLegal(ball.extras);
  const totalRuns = getTotalRuns(ball);

  bowler = ball.bowlerId;

  if (ball.isWicket) {
    const nextBatsman = getNextBatsman();
    if (nextBatsman) {
      if (ball.wicketType === 'run-out' && totalRuns % 2 === 1) {
        [striker, nonStriker] = [nonStriker, nextBatsman];
      } else {
        striker = nextBatsman;
      }
    }
  } else if (legal && totalRuns % 2 === 1) {
    [striker, nonStriker] = [nonStriker, striker];
  }

  if (legal) {
    legalBallsInOver += 1;
  }

  if (legalBallsInOver === 6) {
    over += 1;
    legalBallsInOver = 0;
    [striker, nonStriker] = [nonStriker, striker];
  }

  return {
    striker,
    nonStriker,
    bowler,
    over,
    ballInOver: legalBallsInOver + 1,
    legalBallsInOver,
  };
}

/**
 * Replay all balls to compute current match state
 */
export function calculateMatchState(
  balls: BallRecord[],
  initialState: MatchState,
  getNextBatsman: () => string | null
): MatchState {
  if (balls.length === 0) {
    return initialState;
  }

  return balls.reduce(
    (state, ball) => applyBall(state, ball, getNextBatsman),
    initialState
  );
}
