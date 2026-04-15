package com.logistics.model;

public enum SegmentType {
    ORDER,      // Виконує замовлення
    TRANSFER,   // Їде пуста
    WAITING,    // Чекає
    BREAKDOWN   // Аварія / Поломка
}