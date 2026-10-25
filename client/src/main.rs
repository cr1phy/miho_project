mod ffi;

use eframe::egui::{self, Color32, RichText, Stroke, Vec2};

struct LogicLab {
    expression: String,
    assignments: String,
    result: Result<bool, String>,
}

impl Default for LogicLab {
    fn default() -> Self {
        let mut app = Self {
            expression: "~A | (B & 1)".into(),
            assignments: "A=1, B=0".into(),
            result: Ok(false),
        };
        app.calculate();
        app
    }
}

impl LogicLab {
    fn calculate(&mut self) {
        self.result = ffi::evaluate(&self.expression, &self.assignments);
    }

    fn illustration(ui: &mut egui::Ui) {
        let (rect, _) =
            ui.allocate_exact_size(Vec2::new(ui.available_width(), 160.0), egui::Sense::hover());
        let painter = ui.painter_at(rect);
        let center = rect.center();
        let ink = Color32::from_rgb(53, 34, 51);
        let pink = Color32::from_rgb(244, 145, 171);
        let skin = Color32::from_rgb(249, 203, 181);
        // A small, deliberately cartoonish bust in a pink bikini.
        for side in [-1.0, 1.0] {
            let cup = center + Vec2::new(side * 39.0, 9.0);
            painter.line_segment(
                [
                    cup + Vec2::new(side * 18.0, -30.0),
                    cup + Vec2::new(side * 32.0, -67.0),
                ],
                Stroke::new(9.0, pink),
            );
            painter.circle_filled(cup, 43.0, skin);
            painter.circle_stroke(cup, 43.0, Stroke::new(2.0, ink));
            let mut points = Vec::new();
            for step in 0..=32 {
                let angle = step as f32 * std::f32::consts::PI / 32.0;
                points.push(cup + Vec2::new(42.0 * angle.cos(), 42.0 * angle.sin()));
            }
            painter.add(egui::Shape::convex_polygon(
                points,
                pink,
                Stroke::new(2.0, ink),
            ));
        }
        painter.line_segment(
            [
                center + Vec2::new(-8.0, 16.0),
                center + Vec2::new(8.0, 16.0),
            ],
            Stroke::new(5.0, pink),
        );
    }

    fn content(&mut self, ui: &mut egui::Ui) {
        ui.add_space(12.0);
        ui.label(RichText::new("LOGIC LAB").size(30.0).strong());
        ui.label("Немного логики. Немного форм.");
        Self::illustration(ui);
        ui.add_space(8.0);
        ui.label(RichText::new("Выражение").strong());
        let expression = ui.add_sized(
            [ui.available_width(), 40.0],
            egui::TextEdit::singleline(&mut self.expression)
                .font(egui::TextStyle::Monospace)
                .hint_text("Например: ~A | (B & 1)"),
        );
        ui.add_space(10.0);
        ui.label("Значения переменных");
        let assignments = ui.add_sized(
            [ui.available_width(), 34.0],
            egui::TextEdit::singleline(&mut self.assignments)
                .hint_text("A=1, B=0 — или оставь пустым"),
        );
        ui.add_space(12.0);
        let clicked = ui
            .add_sized([ui.available_width(), 40.0], egui::Button::new("Вычислить"))
            .clicked();
        if expression.changed()
            || assignments.changed()
            || clicked
            || ui.input(|input| input.key_pressed(egui::Key::Enter))
        {
            self.calculate();
        }
        ui.add_space(18.0);
        ui.separator();
        ui.add_space(12.0);
        match &self.result {
            Ok(value) => {
                ui.label(RichText::new("РЕЗУЛЬТАТ").small());
                ui.label(
                    RichText::new(if *value {
                        "1 · Истина"
                    } else {
                        "0 · Ложь"
                    })
                    .size(30.0)
                    .strong()
                    .color(if *value {
                        Color32::from_rgb(126, 225, 174)
                    } else {
                        Color32::from_rgb(244, 167, 185)
                    }),
                );
            }
            Err(error) => {
                ui.colored_label(Color32::from_rgb(255, 145, 145), "Не получилось вычислить");
                ui.label(error);
            }
        }
        ui.add_space(16.0);
        ui.label(
            RichText::new("~  &  |  ^  ->  ==  ~&  ~|  ( )  0  1")
                .monospace()
                .size(13.0),
        );
    }
}

impl eframe::App for LogicLab {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        egui::CentralPanel::default()
            .frame(
                egui::Frame::new()
                    .inner_margin(24)
                    .fill(Color32::from_rgb(27, 27, 27)),
            )
            .show(ui, |ui| {
                egui::ScrollArea::vertical().show(ui, |ui| self.content(ui));
            });
    }
}

fn main() -> eframe::Result {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([560.0, 640.0])
            .with_min_inner_size([360.0, 540.0]),
        ..Default::default()
    };
    eframe::run_native(
        "Logic Lab",
        options,
        Box::new(|cc| {
            cc.egui_ctx.set_visuals(egui::Visuals::dark());
            Ok(Box::new(LogicLab::default()))
        }),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ui_renders_success_and_error_states() {
        let context = egui::Context::default();
        let mut app = LogicLab::default();
        for source in ["1", "0", "A &"] {
            app.expression = source.into();
            app.calculate();
            let mut output = context.run_ui(egui::RawInput::default(), |ui| app.content(ui));
            assert!(!output.shapes.is_empty());
            // This test has no GPU renderer to consume texture uploads.
            output.textures_delta.clear();
        }
    }

    #[test]
    fn result_updates_and_recovers_from_error() {
        let mut app = LogicLab::default();
        assert_eq!(app.result, Ok(false));
        app.expression = "1".into();
        app.calculate();
        assert_eq!(app.result, Ok(true));
        app.expression = "(".into();
        app.calculate();
        assert!(app.result.is_err());
        app.expression = "0".into();
        app.calculate();
        assert_eq!(app.result, Ok(false));
    }
}
