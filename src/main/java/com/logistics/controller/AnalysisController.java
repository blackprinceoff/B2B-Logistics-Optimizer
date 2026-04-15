package com.logistics.controller;

import com.logistics.service.AnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequiredArgsConstructor
public class AnalysisController {

    private final AnalysisService analysisService;

    // 1. Віддає головну сторінку з Картою (index.html)
    @GetMapping("/")
    public String showMapPage() {
        return "index";
    }

    // 2. Віддає сторінку з Графіками (analysis.html)
    @GetMapping("/analysis")
    public String showAnalysisPage() {
        return "analysis";
    }

    // 3. Віддає самі математичні дані у форматі JSON (для графіків)
    @GetMapping("/api/analysis/data")
    @ResponseBody
    public AnalysisService.AnalysisResult getAnalysisData() {
        return analysisService.runFullAnalysis();
    }
}