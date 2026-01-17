document.addEventListener('DOMContentLoaded', function () {

    /* ==========================
       AUTO-HIDE SUCCESS ALERT
    ========================== */
    const successAlert = document.querySelector('.alert-success');
    if (successAlert) {
        setTimeout(() => {
            successAlert.classList.remove('show');
            successAlert.classList.add('fade');
            setTimeout(() => successAlert.remove(), 500);
        }, 3000);
    }

    /* ==========================
       DELETE MODAL HANDLER
    ========================== */
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) {
        deleteModal.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            if (!button) return;

            const imageId = button.getAttribute('data-image-id');
            const deleteForm = document.getElementById('deleteForm');

            if (imageId && deleteForm) {
                deleteForm.action = '/delete-image/' + imageId;
            }
        });
    }

    /* ==========================
       EDIT MODAL HANDLER
    ========================== */
    const editModal = document.getElementById('editModal');
    if (editModal) {
        editModal.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            if (!button) return;

            const imageId = button.getAttribute('data-image-id');
            const imageDesc = button.getAttribute('data-image-desc') || '';
            const imagePath = button.getAttribute('data-image-path') || '';

            const editForm = document.getElementById('editForm');
            const newDescriptionInput = document.getElementById('newDescription');
            const currentImagePreview = document.getElementById('currentImagePreview');
            const fileInput = document.getElementById('imageFile');

            if (editForm && imageId) {
                editForm.action = '/edit-image/' + imageId;
            }

            if (newDescriptionInput) {
                newDescriptionInput.value = imageDesc.trim();
                newDescriptionInput.focus();
            }

            if (currentImagePreview) {
                currentImagePreview.src = imagePath;
            }

            if (fileInput) {
                fileInput.value = '';
            }
        });
    }

    /* ==========================
       SEARCH BAR FILTERING
    ========================== */
    const searchInput = document.getElementById('imageSearch');
    const imageCards = document.querySelectorAll('.image-card-col');
    const noResultsMessage = document.getElementById('noResultsMessage');

    if (searchInput && imageCards.length > 0) {
        searchInput.addEventListener('input', function () {
            const searchTerm = searchInput.value.toLowerCase().trim();
            let resultsFound = 0;

            imageCards.forEach(card => {
                const descriptionElement = card.querySelector('.photo-description');
                const description = descriptionElement
                    ? descriptionElement.textContent.toLowerCase()
                    : '';

                if (!searchTerm || description.includes(searchTerm)) {
                    card.style.display = 'block';
                    resultsFound++;
                } else {
                    card.style.display = 'none';
                }
            });

            if (noResultsMessage) {
                noResultsMessage.style.display =
                    resultsFound === 0 && searchTerm ? 'block' : 'none';
            }
        });
    }

});
