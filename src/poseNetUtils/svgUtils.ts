/**
 * @license
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import paper from "paper";

export class SVGUtils {
  static async importSVG(file: string): Promise<paper.PaperScope> {
    console.log("Importing svg", file);
    let svgScope = new paper.PaperScope();

    // Have an open PR to paper.js to fix this
    let canvas = (svgScope as any).createCanvas(0, 0);

    svgScope.setup(canvas);
    return new Promise((resolve, reject) => {
      console.log("In promise");
      svgScope.project.importSVG(file, () => {
        console.log("** SVG imported **");
        resolve(svgScope);
      });
    });
  }

  static isPath(item: paper.Item) {
    return item.constructor === (item.project as any)._scope.Path;
  }

  static isShape(item: paper.Item) {
    return item.constructor === (item.project as any)._scope.Shape;
  }

  static isGroup(item: paper.Item) {
    return item.constructor === (item.project as any)._scope.Group;
  }

  static findFirstItemWithPrefix(
    root: paper.Item | paper.Project,
    prefix: string
  ): paper.Item | null {
    let items = root.getItems({ recursive: true });
    for (let i = 0; i < items.length; i++) {
      if (items[i].name && items[i].name.startsWith(prefix)) {
        return items[i];
      }
    }
    return null;
  }
}
