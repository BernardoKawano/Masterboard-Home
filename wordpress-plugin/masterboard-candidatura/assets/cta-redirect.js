(function () {
  const config = window.MasterboardCandidaturaCta || {};
  const target = config.candidaturaUrl || '/candidatura/';

  const redirect = (event) => {
    event.preventDefault();
    event.stopPropagation();
    window.location.href = target;
  };

  document.querySelectorAll('.modal-club, a[href="#club"], a[href="#candidatura"]').forEach((element) => {
    element.addEventListener('click', redirect);
  });
})();
