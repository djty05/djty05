// Dashboard interactivity - placeholder for future enhancements
document.addEventListener('DOMContentLoaded', function() {
    // Auto-dismiss flash alerts after 5 seconds
    document.querySelectorAll('.alert-dismissible').forEach(function(alert) {
        setTimeout(function() {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            bsAlert.close();
        }, 5000);
    });
});
