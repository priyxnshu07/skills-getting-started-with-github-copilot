document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("search-input");
  const clearSearchBtn = document.getElementById("clear-search");
  const categoryFilter = document.getElementById("category-filter");
  const enrolledActivitiesDiv = document.getElementById("enrolled-activities");

  let allActivities = {};
  let currentStudentEmail = "";

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      allActivities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      renderActivities(allActivities);

      // Update activity select dropdown
      updateActivitySelect(allActivities);

    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Function to render activities with filtering
  function renderActivities(activities) {
    activitiesList.innerHTML = "";

    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;

    let filteredActivities = Object.entries(activities);

    // Apply search filter
    if (searchTerm) {
      filteredActivities = filteredActivities.filter(([name]) =>
        name.toLowerCase().includes(searchTerm)
      );
    }

    // Apply category filter
    if (selectedCategory !== "all") {
      filteredActivities = filteredActivities.filter(([, details]) =>
        details.category === selectedCategory
      );
    }

    if (filteredActivities.length === 0) {
      activitiesList.innerHTML = "<p>No activities match your search criteria.</p>";
      return;
    }

    filteredActivities.forEach(([name, details]) => {
      const activityCard = createActivityCard(name, details);
      activitiesList.appendChild(activityCard);
    });
  }

  // Function to create activity card
  function createActivityCard(name, details) {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";
    activityCard.setAttribute("data-activity", name);

    const spotsLeft = details.max_participants - details.participants.length;
    const isFull = spotsLeft <= 0;

    activityCard.innerHTML = `
      <h4>
        ${name}
        <span class="activity-category">${details.category}</span>
      </h4>
      <p>${details.description}</p>
      <p><strong>Schedule:</strong> ${details.schedule}</p>
      <p class="spots ${isFull ? 'full' : ''}">
        <strong>Availability:</strong> ${isFull ? 'Full' : `${spotsLeft} spots left`}
      </p>
    `;

    return activityCard;
  }

  // Function to update activity select dropdown
  function updateActivitySelect(activities) {
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    Object.entries(activities).forEach(([name, details]) => {
      const spotsLeft = details.max_participants - details.participants.length;
      if (spotsLeft > 0) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = `${name} (${spotsLeft} spots left)`;
        activitySelect.appendChild(option);
      }
    });
  }

  // Function to fetch and display enrolled activities
  async function fetchEnrolledActivities(email) {
    if (!email) {
      enrolledActivitiesDiv.innerHTML = "<p>Enter your email above to see enrolled activities.</p>";
      return;
    }

    try {
      const response = await fetch(`/student/${encodeURIComponent(email)}/activities`);
      const enrolledActivities = await response.json();

      if (Object.keys(enrolledActivities).length === 0) {
        enrolledActivitiesDiv.innerHTML = "<p>No activities enrolled yet. Sign up for some activities above!</p>";
        return;
      }

      enrolledActivitiesDiv.innerHTML = "";
      Object.entries(enrolledActivities).forEach(([name, details]) => {
        const enrolledCard = createEnrolledActivityCard(name, details, email);
        enrolledActivitiesDiv.appendChild(enrolledCard);
      });

    } catch (error) {
      enrolledActivitiesDiv.innerHTML = "<p>Failed to load enrolled activities.</p>";
      console.error("Error fetching enrolled activities:", error);
    }
  }

  // Function to create enrolled activity card
  function createEnrolledActivityCard(name, details, email) {
    const enrolledCard = document.createElement("div");
    enrolledCard.className = "activity-card enrolled-card";

    enrolledCard.innerHTML = `
      <h4>${name} <span class="activity-category">${details.category}</span></h4>
      <p>${details.description}</p>
      <p><strong>Schedule:</strong> ${details.schedule}</p>
      <p class="status">✓ Enrolled</p>
      <button class="withdraw-btn" data-activity="${name}" data-email="${email}">Withdraw</button>
    `;

    // Add withdraw functionality
    const withdrawBtn = enrolledCard.querySelector(".withdraw-btn");
    withdrawBtn.addEventListener("click", () => withdrawFromActivity(name, email));

    return enrolledCard;
  }

  // Function to withdraw from activity
  async function withdrawFromActivity(activityName, email) {
    try {
      const response = await fetch(`/activities/${encodeURIComponent(activityName)}/withdraw?email=${encodeURIComponent(email)}`, {
        method: "DELETE"
      });

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        // Refresh data
        fetchActivities();
        fetchEnrolledActivities(email);
      } else {
        showMessage(result.detail || "Failed to withdraw", "error");
      }
    } catch (error) {
      showMessage("Failed to withdraw from activity", "error");
      console.error("Error withdrawing:", error);
    }
  }

  // Function to show messages
  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Event listeners
  searchInput.addEventListener("input", () => {
    renderActivities(allActivities);
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    renderActivities(allActivities);
  });

  categoryFilter.addEventListener("change", () => {
    renderActivities(allActivities);
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    currentStudentEmail = email;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        // Refresh data
        fetchActivities();
        fetchEnrolledActivities(email);
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Update enrolled activities when email changes
  document.getElementById("email").addEventListener("input", (e) => {
    currentStudentEmail = e.target.value;
    fetchEnrolledActivities(currentStudentEmail);
  });

  // Initialize app
  fetchActivities();
});
