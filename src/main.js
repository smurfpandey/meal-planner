import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'

import Alpine from 'alpinejs'
import { createIcons, icons } from 'lucide';

window.Alpine = Alpine

const API = {
  async getMeals() {
    const response = await fetch('http://localhost:3000/meals');
    if (!response.ok) {
      throw new Error(`Failed to load meals: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  },

  async addMeal(meal) {
    const response = await fetch('http://localhost:3000/meals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meal)
    });

    if (!response.ok) {
      throw new Error(`Failed to save meal: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
};

Alpine.data('mealPlanner', () => ({
  activeTab: 'home',
  meals: [],
  isLoadingMeals: false,
  mealsError: null,
  days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  dayLabels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  weeklyPlan: {
    monday: {},
    tuesday: {},
    wednesday: {},
    thursday: {},
    friday: {},
    saturday: {},
    sunday: {},
  },
  newMeal: {
    name: '',
    type: '',
    mealTime: []
  },

  async init() {
    // Initialize Lucide icons
    createIcons({ icons });
    await this.loadMeals();
  },

  async loadMeals() {
    this.isLoadingMeals = true;
    this.mealsError = null;

    try {
      const apiData = await API.getMeals();
      this.meals = apiData.meals;
    } catch (error) {
      this.mealsError = error.message;
      console.error('Error loading meals:', error);
    } finally {
      this.isLoadingMeals = false;
      // Refresh icons after DOM update
      this.$nextTick(() => createIcons({ icons }));
    }
  },
  assignMealToPlan(day, mealSlot, mealId) {
    if (mealId === 'remove' || mealId === '') {
      delete this.weeklyPlan[day][mealSlot];
    } else {
      const meal = this.meals.find(m => m.id === mealId);
      if (meal) {
        this.weeklyPlan[day][mealSlot] = meal;
      }
    }
  },
  getMealsByMealTime(mealTime) {
    return this.meals.filter(meal => meal.mealTime.includes(mealTime));
  },
  isPlanEmpty() {
    return this.days.every(day =>
      !this.weeklyPlan[day].breakfast &&
      !this.weeklyPlan[day].lunch &&
      !this.weeklyPlan[day].dinner
    );
  },
}))

Alpine.start()