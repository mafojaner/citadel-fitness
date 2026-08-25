import { NewsletterScreen } from './NewsletterScreen';

/**
 * The Learn tab is the newsletter, and nothing else.
 *
 * It used to be a switcher between the newsletter and Plans, from when Plans
 * had nowhere else to live. Plans now has two proper homes — a tab on
 * desktop, a row under Account on mobile — so a segmented control here was
 * offering a third route to a page this tab has nothing to do with, and
 * charging every visit to the newsletter a control it never needed.
 *
 * Kept as a component rather than pointing the navigator straight at
 * NewsletterScreen: the route is named Newsletter already, and collapsing
 * the two would put the tab's identity in the stack file instead of here,
 * where the next thing added to Learn would look for it.
 */
export function LearnScreen() {
  return <NewsletterScreen />;
}
