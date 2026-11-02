import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  AlertRequest,
  __resetAlerts,
  currentAlert,
  dismissButtonFor,
  resolveAlert,
  showAlert,
  subscribeToAlerts,
} from '../alert';

describe('alert queue', () => {
  beforeEach(() => {
    __resetAlerts();
  });

  it('gives an alert with no buttons a way out', () => {
    showAlert('Error', 'Something went wrong');
    assert.deepEqual(
      currentAlert()?.buttons.map((button) => button.text),
      ['OK']
    );
  });

  it('keeps the message optional', () => {
    showAlert('Saved');
    assert.equal(currentAlert()?.title, 'Saved');
    assert.equal(currentAlert()?.message, undefined);
  });

  it('shows alerts one at a time, in order', () => {
    showAlert('First');
    showAlert('Second');

    assert.equal(currentAlert()?.title, 'First');
    resolveAlert(currentAlert()!.id);
    assert.equal(currentAlert()?.title, 'Second');
  });

  it('runs the pressed button handler', () => {
    let pressed = '';
    showAlert('Leave?', undefined, [
      { text: 'Stay', style: 'cancel' },
      { text: 'Leave', onPress: () => (pressed = 'Leave') },
    ]);

    const request = currentAlert()!;
    resolveAlert(request.id, request.buttons[1]);

    assert.equal(pressed, 'Leave');
    assert.equal(currentAlert(), undefined);
  });

  it('ignores a second press on an already dismissed alert', () => {
    let presses = 0;
    showAlert('Delete?', undefined, [{ text: 'Delete', onPress: () => (presses += 1) }]);

    const request = currentAlert()!;
    resolveAlert(request.id, request.buttons[0]);
    resolveAlert(request.id, request.buttons[0]);

    assert.equal(presses, 1);
  });

  it('queues an alert raised from a button handler behind the current one', () => {
    showAlert('Delete this?', undefined, [
      { text: 'Delete', onPress: () => showAlert('Deleted') },
    ]);

    const request = currentAlert()!;
    resolveAlert(request.id, request.buttons[0]);

    // The handler ran after the first left the queue, so the second is alone
    // and visible rather than stuck behind a dialog already on its way out.
    assert.equal(currentAlert()?.title, 'Deleted');
  });

  it('notifies subscribers, and stops after unsubscribing', () => {
    const seen: number[] = [];
    const unsubscribe = subscribeToAlerts((queue) => seen.push(queue.length));

    // Subscribing reports the current state immediately.
    assert.deepEqual(seen, [0]);

    showAlert('One');
    assert.deepEqual(seen, [0, 1]);

    unsubscribe();
    showAlert('Two');
    assert.deepEqual(seen, [0, 1]);
  });
});

describe('dismissButtonFor', () => {
  const build = (buttons: AlertRequest['buttons']): AlertRequest => ({
    id: 1,
    title: 'Title',
    buttons,
  });

  it('uses the cancel button', () => {
    const button = dismissButtonFor(
      build([{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive' }])
    );
    assert.equal(button?.text, 'Cancel');
  });

  it('uses a lone acknowledgement', () => {
    assert.equal(dismissButtonFor(build([{ text: 'OK' }]))?.text, 'OK');
  });

  it('refuses to treat a lone destructive button as a dismissal', () => {
    // Tapping the backdrop must never delete anything.
    assert.equal(dismissButtonFor(build([{ text: 'Delete', style: 'destructive' }])), undefined);
  });

  it('refuses to guess between choices', () => {
    const button = dismissButtonFor(build([{ text: 'View it' }, { text: 'Done' }]));
    assert.equal(button, undefined);
  });
});
