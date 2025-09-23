function openTab(evt, tabName) {
  const tabContents = document.querySelectorAll('.tab-content');
  const tabButtons = document.querySelectorAll('.tab-buttons button');

  tabContents.forEach(tc => tc.classList.remove('active'));
  tabButtons.forEach(tb => tb.classList.remove('active'));

  document.getElementById(tabName).classList.add('active');
  evt.currentTarget.classList.add('active');
}